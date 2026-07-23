"""
UPS Store FRS + CMRA - Automated Report Puller
===============================================
What this does:
  1. Logs into frs.theupsstore.com, pulls Box Holder List CSVs for all 5 centers
  2. Logs into cmra-ext.usps.com for each center, searches 'active', reads the count
  3. Saves CSVs + bcg_counts.json into C:/UPS_Reports/<today's date>/
  4. Deletes report folders older than 5 days

HOW TO RUN (first time / supervised):
  python pull_reports.py --visible

HOW TO RUN (normal / scheduled):
  python pull_reports.py

HOW TO RUN (FRS only, skip CMRA):
  python pull_reports.py --no-bcg
"""

import re
import sys
import json
import time
import shutil
import argparse
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

# ---------------- CONFIG ----------------
LOGIN_URL      = "https://frs.theupsstore.com/Framework/SignIn.aspx"
REPORT_URL     = "https://frs.theupsstore.com/UI/Reporting/Mailbox/BoxHolderList.aspx"

# CMRA URLs — goto= tells ForgeRock to redirect to manage1583 after login
USPS_LOGIN_URL = (
    "https://verified.usps.com/am/XUI/?realm=/alpha"
    "&goto=https%3A%2F%2Fcmra-ext.usps.com%2Fcmra-external-webapp"
    "%2Fsecure%2Fmanage1583%3F_ig%3Dtrue"
)
MANAGE1583_URL = "https://cmra-ext.usps.com/cmra-external-webapp/secure/manage1583?_ig=true"

OUTPUT_ROOT    = Path(r"C:\UPS_Reports")
RETENTION_DAYS = 5
LOGIN1_CENTERS = ["3606", "6822", "6964", "7177"]
LOGIN2_CENTERS = ["7"]
BCG_CENTERS    = ["7", "3606", "6822", "6964", "7177"]
# -----------------------------------------


def load_config():
    config_path = Path(__file__).parent / "config.env"
    if not config_path.exists():
        print(f"ERROR: config.env not found at {config_path}")
        sys.exit(1)

    values = {}
    for line in config_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, val = line.partition("=")
            values[key.strip()] = val.strip()

    required_frs = ["LOGIN1_USERNAME", "LOGIN1_PASSWORD", "LOGIN2_USERNAME", "LOGIN2_PASSWORD"]
    missing = [k for k in required_frs if not values.get(k)]
    if missing:
        print(f"ERROR: config.env missing FRS keys: {', '.join(missing)}")
        sys.exit(1)

    return values


def cleanup_old_folders(root: Path, days: int):
    if not root.exists():
        return
    cutoff = datetime.now() - timedelta(days=days)
    for folder in root.iterdir():
        if not folder.is_dir():
            continue
        try:
            if datetime.strptime(folder.name, "%Y-%m-%d") < cutoff:
                print(f"Deleting old folder: {folder}")
                shutil.rmtree(folder, ignore_errors=True)
        except ValueError:
            continue


# ── FRS functions ─────────────────────────────────────────────────────────────

def frs_login(page, username: str, password: str):
    print(f"  Logging in as {username}...")
    page.goto(LOGIN_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    user_field = page.locator("input[type='text']").first
    user_field.click(click_count=3)
    user_field.fill(username)

    pass_field = page.locator("input[type='password']").first
    pass_field.click()
    pass_field.fill(password)

    page.get_by_role("button", name="Sign In").click()
    page.wait_for_timeout(2000)

    if "SignIn" in page.url or "signin" in page.url.lower():
        print("  *** CAPTCHA or wrong credentials — solve in browser, then press Enter ***")
        input()
        page.wait_for_load_state("networkidle")

    print("  Logged in.")


def frs_sign_out(page):
    page.goto("https://frs.theupsstore.com/Framework/SignIn.aspx?signout=true")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    if page.locator("text=Return to Sign In").count() > 0:
        page.locator("text=Return to Sign In").first.click()
        page.wait_for_load_state("networkidle")
    print("  Signed out.")


VIEWER_ID = 'ctl00_ctl00_ctl00_EnterpriseBodyContentPlaceHolder_BodyContentPlaceHolder_reportViewer'

def pull_center_report(page, center_number: str, save_dir: Path):
    print(f"  Pulling center {center_number}...")

    try:
        page.goto(REPORT_URL, wait_until="domcontentloaded")
    except Exception:
        pass
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    if "BoxHolderList" not in page.url:
        page.goto(REPORT_URL, wait_until="networkidle")
        page.wait_for_timeout(1000)

    page.select_option("select", value=center_number)
    page.wait_for_timeout(500)

    agree_dd = page.locator("select").filter(has=page.locator("option:has-text('New And Active')")).first
    agree_dd.select_option(label="New And Active")
    page.wait_for_timeout(400)

    page.locator("input[value='Go'], button:has-text('Go'), a:has-text('Go')").first.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    try:
        page.wait_for_function(
            f"() => typeof $find === 'function' && $find('{VIEWER_ID}') !== null",
            timeout=25000
        )
        print(f"    Report viewer ready.")
    except Exception as e:
        print(f"    Warning: reportViewer wait timed out ({e}). Trying anyway...")
    page.wait_for_timeout(1000)

    for attempt in range(1, 4):
        try:
            with page.expect_download(timeout=30000) as dl:
                page.evaluate(f"$find('{VIEWER_ID}').exportReport('CSV')")
            download = dl.value
            dest = save_dir / f"center_{center_number}_{datetime.now().strftime('%Y-%m-%d')}.csv"
            download.save_as(dest)
            print(f"    Saved: {dest.name}")
            return
        except Exception as e:
            print(f"    Attempt {attempt} failed: {e}")
            if attempt < 3:
                page.wait_for_timeout(2500)
            else:
                raise RuntimeError(f"Could not export center {center_number} after 3 attempts.") from e


# ── CMRA active-count functions ───────────────────────────────────────────────

def cmra_login(page, context, username: str, password: str):
    """Log into CMRA via USPS login with goto=manage1583, then navigate directly if redirect is slow."""
    print(f"  CMRA login as {username}...")
    context.clear_cookies()

    page.goto(USPS_LOGIN_URL)
    page.wait_for_load_state("load", timeout=30000)
    page.wait_for_timeout(2000)

    user_field = page.locator(
        "input[name='IDToken1'], input[id='IDToken1'], input[name='username'], input[type='text']"
    ).first
    user_field.wait_for(timeout=10000)
    user_field.click(click_count=3)
    user_field.fill(username)

    pass_field = page.locator(
        "input[name='IDToken2'], input[id='IDToken2'], input[type='password']"
    ).first
    pass_field.click()
    pass_field.fill(password)

    page.get_by_role("button", name="Sign In").click()

    # Wait for ForgeRock to redirect to manage1583 — can be slow on some centers
    try:
        page.wait_for_url("**/cmra-ext.usps.com/**", timeout=45000)
    except Exception:
        # Redirect timed out — should be authenticated, navigate directly
        if "verified.usps.com" not in page.url and "cmra-ext.usps.com" not in page.url:
            print(f"  *** CMRA login failed for {username} — check credentials then press Enter ***")
            input()

    page.wait_for_timeout(1000)

    # If not on manage1583 yet, navigate there (we're authenticated now)
    if "manage1583" not in page.url:
        page.goto(MANAGE1583_URL)
        page.wait_for_load_state("load", timeout=30000)
        page.wait_for_timeout(1500)

    print("  CMRA logged in.")


def cmra_get_active_count(page) -> int | None:
    """On the manage-1583 table page: search 'active', read the filtered count."""
    # Wait for the DataTables search box to appear
    try:
        page.wait_for_selector(".dataTables_filter input, input[type='search']", timeout=15000)
    except Exception:
        print("    WARNING: DataTables search box not found.")
        return None

    page.wait_for_timeout(1000)

    search_box = page.locator(".dataTables_filter input, input[type='search']").first
    search_box.click(click_count=3)
    search_box.fill("active")
    page.wait_for_timeout(2000)  # wait for table to filter

    # Read footer: "Showing 1 to 10 of X entries (filtered from Y total entries)"
    try:
        info_el = page.locator(".dataTables_info").first
        info_text = info_el.inner_text(timeout=10000)
        print(f"    Footer: {info_text.strip()}")
    except Exception as e:
        print(f"    WARNING: Could not read DataTables footer: {e}")
        return None

    # Extract the first number after "of" — that's the filtered (active) count
    m = re.search(r"\bof\s+([\d,]+)\s+entr", info_text)
    if m:
        return int(m.group(1).replace(",", ""))

    print(f"    WARNING: Could not parse count from footer: {info_text!r}")
    return None


def cmra_sign_out(page):
    """Click Sign Out in the CMRA nav bar."""
    for selector in ["a:has-text('Sign Out')", "button:has-text('Sign Out')",
                     "a:has-text('Logout')", "button:has-text('Logout')"]:
        if page.locator(selector).count() > 0:
            page.locator(selector).first.click()
            page.wait_for_load_state("load", timeout=15000)
            page.wait_for_timeout(1000)
            print("  CMRA signed out.")
            break
    # Always clear to blank to fully flush session before next login
    page.goto("about:blank")
    page.wait_for_timeout(1000)
    print("  CMRA session cleared.")


def pull_bcg_active_counts(page, config: dict) -> dict:
    """
    For each BCG center: login → search 'active' → read count → sign out.
    Returns {center: count} for successfully pulled centers.
    """
    results = {}
    missing_creds = []

    for center in BCG_CENTERS:
        u_key = f"BCG_USER_{center}"
        p_key = f"BCG_PASS_{center}"
        if not config.get(u_key) or not config.get(p_key):
            missing_creds.append(center)
            continue

        print(f"\n  Center {center}:")
        cmra_login(page, context, config[u_key], config[p_key])
        count = cmra_get_active_count(page)
        if count is not None:
            results[center] = count
            print(f"    BCG active count: {count}")
        else:
            print(f"    Could not get count for center {center} — skipping.")
        cmra_sign_out(page)
        page.wait_for_timeout(500)

    if missing_creds:
        print(f"\n  Skipped centers {missing_creds} — add BCG_USER/BCG_PASS to config.env")

    return results


# ── main ──────────────────────────────────────────────────────────────────────

def run(headless: bool, skip_bcg: bool = False):
    config = load_config()

    today   = datetime.now().strftime("%Y-%m-%d")
    save_dir = OUTPUT_ROOT / today
    save_dir.mkdir(parents=True, exist_ok=True)
    cleanup_old_folders(OUTPUT_ROOT, RETENTION_DAYS)

    print("Closing any open Edge instances...")
    subprocess.run(["taskkill", "/f", "/im", "msedge.exe"], capture_output=True)
    time.sleep(2)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=r"C:\UPS_Automation\EdgeProfile",
            channel="msedge",
            headless=False,
            slow_mo=300 if not headless else 0,
        )
        page = context.new_page()

        # ── FRS: pull Box Holder List CSVs ────────────────────────────────────
        print("\n── FRS Reports ──────────────────────────────────────────────")
        frs_login(page, config["LOGIN1_USERNAME"], config["LOGIN1_PASSWORD"])
        for center in LOGIN1_CENTERS:
            pull_center_report(page, center, save_dir)
        frs_sign_out(page)

        frs_login(page, config["LOGIN2_USERNAME"], config["LOGIN2_PASSWORD"])
        for center in LOGIN2_CENTERS:
            pull_center_report(page, center, save_dir)
        frs_sign_out(page)

        # ── CMRA: pull active BCG counts ──────────────────────────────────────
        if not skip_bcg:
            print("\n── CMRA Active Counts ───────────────────────────────────────")
            bcg_counts = pull_bcg_active_counts(page, config)

            if bcg_counts:
                out = save_dir / "bcg_counts.json"
                out.write_text(json.dumps(bcg_counts, indent=2))
                print(f"\n  BCG counts saved to: {out.name}")
                print(f"  {bcg_counts}")
            else:
                print("\n  No BCG counts retrieved — check credentials in config.env")
        else:
            print("\nBCG pull skipped (--no-bcg flag).")

        context.close()

    print(f"\nAll done. Reports saved to: {save_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--visible", action="store_true", help="Show browser (use for test runs)")
    parser.add_argument("--no-bcg",  action="store_true", help="Skip CMRA active count pull")
    args = parser.parse_args()
    run(headless=not args.visible, skip_bcg=args.no_bcg)
