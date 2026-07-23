"""
CMRA Active Count Tester
=========================
Tests ONLY the CMRA login + active count extraction for one center.
Use this to debug the CMRA portion without re-running FRS.

Usage:
  python test_cmra.py          # tests all centers
  python test_cmra.py 7        # tests center 7 only
  python test_cmra.py 3606     # tests center 3606 only
"""

import re
import sys
import json
import time
import subprocess
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright

# Login URL with goto= so ForgeRock redirects to manage1583 after auth
USPS_LOGIN_URL = (
    "https://verified.usps.com/am/XUI/?realm=/alpha"
    "&goto=https%3A%2F%2Fcmra-ext.usps.com%2Fcmra-external-webapp"
    "%2Fsecure%2Fmanage1583%3F_ig%3Dtrue"
)
MANAGE1583_URL = "https://cmra-ext.usps.com/cmra-external-webapp/secure/manage1583?_ig=true"

CENTERS = ["7", "3606", "6822", "6964", "7177"]


def load_config():
    config_path = Path(__file__).parent / "config.env"
    values = {}
    for line in config_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        values[key.strip()] = val.strip()
    return values


def cmra_login(page, context, username, password):
    # Clear cookies so no previous session bleeds in
    context.clear_cookies()

    # goto= parameter tells ForgeRock to redirect to manage1583 after login
    print(f"  Going to USPS login (goto=manage1583)...")
    page.goto(USPS_LOGIN_URL)
    page.wait_for_load_state("load", timeout=30000)
    page.wait_for_timeout(2000)
    print(f"  URL: {page.url}")

    user_field = page.locator(
        "input[name='IDToken1'], input[id='IDToken1'], input[name='username'], input[type='text']"
    ).first
    user_field.wait_for(timeout=10000)
    user_field.click(click_count=3)
    user_field.fill(username)
    print(f"  Filled username: {username}")

    pass_field = page.locator(
        "input[name='IDToken2'], input[id='IDToken2'], input[type='password']"
    ).first
    pass_field.click()
    pass_field.fill(password)
    print(f"  Filled password.")

    page.get_by_role("button", name="Sign In").click()

    # Wait for ForgeRock to redirect to manage1583 — can be slow on some centers
    try:
        page.wait_for_url("**/cmra-ext.usps.com/**", timeout=45000)
        print(f"  Redirected to CMRA. URL: {page.url}")
    except Exception:
        # Redirect timed out — but we should be authenticated now, so navigate directly
        print(f"  Redirect timed out (URL: {page.url}) — navigating to manage1583 directly...")
        if "verified.usps.com" not in page.url and "cmra-ext.usps.com" not in page.url:
            print(f"  *** Login may have failed for {username} — check credentials then press Enter ***")
            input()

    page.wait_for_timeout(1000)

    # If we didn't land on manage1583, go there now (we're authenticated)
    if "manage1583" not in page.url:
        page.goto(MANAGE1583_URL)
        page.wait_for_load_state("load", timeout=30000)
        page.wait_for_timeout(1500)
        print(f"  manage1583 loaded. URL: {page.url}")


def cmra_get_active_count(page):
    print(f"  Waiting for table...")
    try:
        page.wait_for_selector(
            ".dataTables_filter input, input[type='search']",
            timeout=20000
        )
    except Exception:
        print(f"  WARNING: Search box not found. URL: {page.url} | Title: {page.title()}")
        return None

    page.wait_for_timeout(1000)

    search_box = page.locator(".dataTables_filter input, input[type='search']").first
    search_box.click(click_count=3)
    search_box.fill("active")
    page.wait_for_timeout(2000)

    try:
        info_text = page.locator(".dataTables_info").first.inner_text(timeout=10000)
        print(f"  Footer: {info_text.strip()}")
    except Exception as e:
        print(f"  WARNING: Could not read footer: {e}")
        return None

    m = re.search(r"\bof\s+([\d,]+)\s+entr", info_text)
    if m:
        return int(m.group(1).replace(",", ""))

    print(f"  WARNING: Could not parse count from: {info_text!r}")
    return None


def cmra_sign_out(page):
    for selector in ["a:has-text('Sign Out')", "button:has-text('Sign Out')"]:
        if page.locator(selector).count() > 0:
            page.locator(selector).first.click()
            page.wait_for_load_state("load", timeout=15000)
            page.wait_for_timeout(500)
            print(f"  Signed out.")
            return
    print(f"  No sign-out button found — cookies will be cleared on next center.")


def run(centers_to_test):
    config = load_config()
    results = {}

    print("Closing any open Edge instances...")
    subprocess.run(["taskkill", "/f", "/im", "msedge.exe"], capture_output=True)
    time.sleep(2)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=r"C:\UPS_Automation\EdgeProfile",
            channel="msedge",
            headless=False,
            slow_mo=200,
        )
        page = context.new_page()

        for center in centers_to_test:
            u_key = f"BCG_USER_{center}"
            p_key = f"BCG_PASS_{center}"
            if not config.get(u_key) or not config.get(p_key):
                print(f"\nCenter {center}: SKIPPED — {u_key}/{p_key} not in config.env")
                continue

            print(f"\n{'─'*40}")
            print(f"Center {center}")
            print(f"{'─'*40}")

            cmra_login(page, context, config[u_key], config[p_key])
            count = cmra_get_active_count(page)
            if count is not None:
                results[center] = count
                print(f"  ✓ BCG active count: {count}")
            else:
                print(f"  ✗ Could not get count for center {center}")
            cmra_sign_out(page)

        context.close()

    print(f"\n{'='*40}")
    print("Results:")
    for c in centers_to_test:
        val = results.get(c, "FAILED")
        print(f"  Center {c}: {val}")
    print(f"{'='*40}")
    input("\nPress Enter to close.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("center", nargs="?", help="Single center to test (e.g. 7, 3606)")
    args = parser.parse_args()

    if args.center:
        c = args.center.lstrip("0") or "0"
        if c not in CENTERS:
            print(f"Unknown center '{args.center}'. Valid: {CENTERS}")
            sys.exit(1)
        to_test = [c]
    else:
        to_test = CENTERS

    run(to_test)
