"""
BCG Dashboard Updater
======================
Reads MPS CSVs from C:/UPS_Reports/<latest date>/ and updates:
  - bcg_dashboard.html
  - run_bcg_update.ps1

Usage:
  python update_dashboard.py                                  # CSVs only (BCG unchanged)
  python update_dashboard.py --bcg 7=335,3606=725,6822=204,6964=215,7177=372
  python update_dashboard.py --inspect                        # show numbers, no file writes
"""

import sys
import re
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from collections import Counter

# ── paths ──────────────────────────────────────────────────────────────────────
REPORTS_ROOT  = Path(r"C:\UPS_Reports")
DASHBOARD_DIR = Path(r"C:\Users\ikevi\OneDrive\Desktop\TUPSS Cowork\Trello Automation - TUPSS x BCG")
DASHBOARD     = DASHBOARD_DIR / "bcg_dashboard.html"
PS1_SCRIPT    = DASHBOARD_DIR / "run_bcg_update.ps1"

# Centers in display order
CENTERS = ["7", "3606", "6822", "6964", "7177"]
JUNK_BOXES = {"7777", "9999", "1010"}


# ── CSV helpers ────────────────────────────────────────────────────────────────
def count_mps(csv_path: Path):
    """Return (pmb_count, cards_count) from an MPS CSV file."""
    try:
        import csv
        pmb = 0
        cards = 0
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("BoxNumber", "").strip() in JUNK_BOXES:
                    continue
                status = row.get("AgreementStatus", "").strip()
                if status not in ("Active", "New"):
                    continue
                pmb += 1
                billing = row.get("BillingOptions", "").strip()
                if billing in ("Card On File", "House Account"):
                    cards += 1
        return pmb, cards
    except Exception as e:
        print(f"  ERROR reading {csv_path.name}: {e}")
        return None, None


# ── BCG .xls helpers ───────────────────────────────────────────────────────────
def count_bcg(xls_path: Path):
    """Return (center_number, bcg_count) from a BCG quarterly review HTML/xls file."""
    try:
        from html.parser import HTMLParser

        class TableParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.in_td = False
                self.rows = []
                self.current_row = []
                self.text = []

            def handle_starttag(self, tag, attrs):
                if tag == "tr":
                    self.current_row = []
                elif tag in ("td", "th"):
                    self.in_td = True
                    self._buf = ""

            def handle_endtag(self, tag):
                if tag in ("td", "th"):
                    self.current_row.append(self._buf.strip())
                    self.in_td = False
                elif tag == "tr":
                    if self.current_row:
                        self.rows.append(self.current_row)
                        self.current_row = []

            def handle_data(self, data):
                self.text.append(data)
                if self.in_td:
                    self._buf += data

        content = xls_path.read_text(encoding="utf-8", errors="ignore")
        parser = TableParser()
        parser.feed(content)

        full_text = " ".join(parser.text)
        center_match = re.search(r"THE UPS STORE\s+(\d+)", full_text, re.IGNORECASE)
        center = center_match.group(1) if center_match else None

        # Normalise center 0007 → 7
        if center and center.lstrip("0"):
            center = center.lstrip("0") or "0"

        bcg_count = sum(
            1 for row in parser.rows[1:]
            if row and row[0].strip() in ("Current", "New")
        )

        return center, bcg_count
    except Exception as e:
        print(f"  ERROR reading {xls_path.name}: {e}")
        return None, None


# ── find latest report folder ──────────────────────────────────────────────────
def find_latest_folder():
    if not REPORTS_ROOT.exists():
        print(f"ERROR: {REPORTS_ROOT} not found. Run pull_reports.py first.")
        sys.exit(1)
    folders = sorted(
        [f for f in REPORTS_ROOT.iterdir() if f.is_dir() and re.match(r"\d{4}-\d{2}-\d{2}", f.name)],
        reverse=True
    )
    if not folders:
        print(f"ERROR: No date folders found in {REPORTS_ROOT}.")
        sys.exit(1)
    return folders[0]


# ── dashboard HTML update ──────────────────────────────────────────────────────
def update_html(pmb_map, bcg_map, cards_map):
    html = DASHBOARD.read_text(encoding="utf-8")

    # Update each center's pmb, bcg, cards in the CENTERS array
    for store in CENTERS:
        pmb   = pmb_map.get(store)
        bcg   = bcg_map.get(store)
        cards = cards_map.get(store)

        if pmb is not None:
            html = re.sub(
                rf"(store:'{store}',[^}}]*?pmb:)\d+",
                rf"\g<1>{pmb}", html
            )
        if bcg is not None:
            html = re.sub(
                rf"(store:'{store}',[^}}]*?bcg:)\d+",
                rf"\g<1>{bcg}", html
            )
        if cards is not None:
            html = re.sub(
                rf"(store:'{store}',[^}}]*?cards:)\d+",
                rf"\g<1>{cards}", html
            )

    # Snapshot = previous bcg values (before this update)
    old_bcg = re.findall(r"const lastSnapshot\s*=\s*\[([^\]]+)\]", html)
    if old_bcg:
        old_vals = [v.strip() for v in old_bcg[0].split(",")]
        # shift: thisUpdate becomes lastUpdate, thisUpdate = now
        new_snapshot = ", ".join(
            str(bcg_map.get(c, int(v))) for c, v in zip(CENTERS, old_vals)
        )
    else:
        new_snapshot = ", ".join(str(bcg_map.get(c, 0)) for c in CENTERS)

    # Get old thisUpdate to become new lastUpdate
    old_this = re.search(r"const thisUpdate\s*=\s*new Date\('([^']+)'\)", html)
    old_this_val = old_this.group(1) if old_this else datetime.now().isoformat()

    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    html = re.sub(r"const lastSnapshot\s*=\s*\[[^\]]+\]",
                  f"const lastSnapshot = [{new_snapshot}]", html)
    html = re.sub(r"const lastUpdate\s*=\s*new Date\('[^']+'\)",
                  f"const lastUpdate   = new Date('{old_this_val}')", html)
    html = re.sub(r"const thisUpdate\s*=\s*new Date\('[^']+'\)",
                  f"const thisUpdate   = new Date('{now_iso}')", html)

    DASHBOARD.write_text(html, encoding="utf-8")
    print(f"  Updated: {DASHBOARD}")


# ── PS1 update ─────────────────────────────────────────────────────────────────
def update_ps1(pmb_map, bcg_map):
    ps1 = PS1_SCRIPT.read_text(encoding="utf-8")

    for store in CENTERS:
        if store in bcg_map:
            ps1 = re.sub(
                rf'("{store}"\s*=\s*)\d+',
                rf'\g<1>{bcg_map[store]}',
                ps1
            )
        if store in pmb_map:
            ps1 = re.sub(
                rf'(store="{store}";[^;]*?pmb=)\d+',
                rf'\g<1>{pmb_map[store]}',
                ps1
            )

    PS1_SCRIPT.write_text(ps1, encoding="utf-8")
    print(f"  Updated: {PS1_SCRIPT}")


# ── main ───────────────────────────────────────────────────────────────────────
def run(inspect_only: bool, bcg_overrides: dict = None):
    folder = find_latest_folder()
    print(f"\nUsing report folder: {folder}\n")

    # ── MPS CSVs ──
    pmb_map   = {}
    cards_map = {}
    print("Reading MPS CSVs:")
    for f in sorted(folder.glob("*.csv")):
        m = re.search(r"center[_\-]([^_\-]+)[_\-]", f.stem)
        if not m:
            continue
        store = m.group(1).lstrip("0") or "0"
        if store not in CENTERS:
            continue
        pmb, cards = count_mps(f)
        if pmb is not None:
            pmb_map[store]   = pmb
            cards_map[store] = cards
            print(f"  Center {store}: PMB={pmb}, Cards={cards}")

    # ── BCG counts: --bcg arg → bcg_counts.json → unchanged ──────────────────
    bcg_map = dict(bcg_overrides) if bcg_overrides else {}
    if bcg_map:
        print("\nBCG counts from --bcg argument:")
        for store in CENTERS:
            if store in bcg_map:
                print(f"  Center {store}: BCG={bcg_map[store]}")
    else:
        json_file = folder / "bcg_counts.json"
        if json_file.exists():
            import json
            raw = json.loads(json_file.read_text())
            # normalize keys (strip leading zeros)
            for k, v in raw.items():
                norm = k.lstrip("0") or "0"
                if norm in CENTERS:
                    bcg_map[norm] = int(v)
            print(f"\nBCG counts from {json_file.name}:")
            for store in CENTERS:
                if store in bcg_map:
                    print(f"  Center {store}: BCG={bcg_map[store]}")
        else:
            print("\nNo BCG counts found — BCG values unchanged in dashboard.")

    # ── summary ──
    print("\n── Calculated values ──────────────────────────────")
    for store in CENTERS:
        pmb   = pmb_map.get(store, "—")
        bcg   = bcg_map.get(store, "—")
        cards = cards_map.get(store, "—")
        missing = (pmb - bcg) if isinstance(pmb, int) and isinstance(bcg, int) else "—"
        print(f"  Center {store:4s}  PMB={pmb}  BCG={bcg}  Cards={cards}  Missing={missing}")

    if inspect_only:
        print("\n[inspect mode — no files changed]")
        return

    print("\nUpdating dashboard files...")
    update_html(pmb_map, bcg_map, cards_map)
    update_ps1(pmb_map, bcg_map)
    print("\nDone. Now run run_bcg_update.ps1 to push to Trello + Netlify.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true",
                        help="Show calculated numbers without writing any files")
    parser.add_argument("--bcg", type=str, default="",
                        help="BCG overrides: 7=335,3606=725,6822=204,6964=215,7177=372")
    args = parser.parse_args()

    # Parse --bcg overrides into a dict passed to run()
    bcg_overrides = {}
    if args.bcg:
        for pair in args.bcg.split(","):
            if "=" in pair:
                k, v = pair.strip().split("=", 1)
                bcg_overrides[k.strip()] = int(v.strip())

    run(inspect_only=args.inspect, bcg_overrides=bcg_overrides)
