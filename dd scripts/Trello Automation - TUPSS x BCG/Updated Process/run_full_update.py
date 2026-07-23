"""
BCG Full Monthly Update
========================
One script does everything:
  1. Pulls fresh FRS Box Holder List CSVs (opens Edge browser)
  2. Logs into each center's CMRA account, searches 'active', reads the count
  3. Saves both CSVs and BCG counts automatically
  4. Updates bcg_dashboard.html and run_bcg_update.ps1

HOW TO RUN:
  python run_full_update.py

After it finishes, right-click run_bcg_update.ps1 → Run with PowerShell
to push the updated dashboard to Trello + Netlify.
"""

import sys
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent


def header(text):
    print()
    print("─" * 54)
    print(f"  {text}")
    print("─" * 54)


def pull_reports():
    header("Step 1 of 2 — Pulling FRS Reports + CMRA Active Counts")
    print("  Edge will open automatically.")
    print("  - FRS: pulls Box Holder List CSVs for all 5 centers")
    print("  - CMRA: logs into each center, reads active BCG count")
    print("  - If a CAPTCHA appears, solve it then press Enter here.\n")
    input("  Press Enter to start...")

    pull_script = SCRIPT_DIR / "pull_reports.py"
    if not pull_script.exists():
        print(f"\n  ERROR: pull_reports.py not found at {pull_script}")
        input("\n  Press Enter to exit.")
        sys.exit(1)

    result = subprocess.run(
        [sys.executable, str(pull_script), "--visible"],
        cwd=str(SCRIPT_DIR)
    )

    if result.returncode != 0:
        print("\n  ERROR: pull_reports.py failed — see output above.")
        input("\n  Press Enter to exit.")
        sys.exit(1)

    print("\n  Pull complete.")


def update_dashboard():
    header("Step 2 of 2 — Updating Dashboard")

    update_script = SCRIPT_DIR / "update_dashboard.py"
    if not update_script.exists():
        print(f"\n  ERROR: update_dashboard.py not found at {update_script}")
        input("\n  Press Enter to exit.")
        sys.exit(1)

    # No --bcg needed — update_dashboard.py reads bcg_counts.json automatically
    result = subprocess.run(
        [sys.executable, str(update_script)],
        cwd=str(SCRIPT_DIR)
    )

    if result.returncode != 0:
        print("\n  ERROR: Dashboard update failed — see output above.")
        input("\n  Press Enter to exit.")
        sys.exit(1)


def main():
    print()
    print("=" * 54)
    print("  BCG Full Monthly Update — TUPSS")
    print("=" * 54)

    pull_reports()
    update_dashboard()

    header("Done!")
    print("  bcg_dashboard.html and run_bcg_update.ps1 are updated.\n")
    print("  Next step:")
    print("  Right-click run_bcg_update.ps1 → Run with PowerShell")
    print("  to push the dashboard to Trello + Netlify.")
    print()
    input("  Press Enter to close.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled.")
        sys.exit(0)
