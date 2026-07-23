# Setup Instructions

## IMPORTANT — read this first
I could not test this script against the live site (no internet access on my end).
The selectors in `pull_reports.py` marked `# placeholder - verify` are my best
guess based on the screenshots you shared, but they may not match the real
page exactly. **You must do a supervised test run (Step 4 below) before
scheduling this to run automatically.** If something doesn't click correctly,
send me a screenshot of what happened and I'll fix the script.

---

## Step 1: Install Python
1. Go to https://python.org/downloads
2. Download and run the installer
3. **Check the box "Add Python to PATH"** during install — this matters
4. Click Install

## Step 2: Get the files
Copy these 4 files into a folder, e.g. `C:\UPS_Automation\`:
- `pull_reports.py`
- `config.env`
- `requirements.txt`
- `SETUP_INSTRUCTIONS.md` (this file)

## Step 3: Install required packages
Open Command Prompt (search "cmd" in Start Menu), then run:

```
cd C:\UPS_Automation
pip install -r requirements.txt
playwright install chromium
```

Wait for both to finish (may take a few minutes).

## Step 4: Fill in your login info
1. Open `config.env` in Notepad
2. Fill in your two logins:
   ```
   LOGIN1_USERNAME=your_username_here
   LOGIN1_PASSWORD=your_password_here
   LOGIN2_USERNAME=your_username_here
   LOGIN2_PASSWORD=your_password_here
   ```
3. Save and close

## Step 5: SUPERVISED TEST RUN (do this before scheduling anything)
In Command Prompt:

```
cd C:\UPS_Automation
python pull_reports.py --visible
```

A browser window will open and you'll watch it:
- Log in
- Click through Mailbox Reports → Box Holder List
- Select each center number
- Export CSV
- Repeat for the second login

**Watch closely.** If it fails at any point (wrong button, page looks
different, error message), stop it (Ctrl+C in the Command Prompt window),
take a screenshot, and send it to me — I'll fix the exact step.

If it completes successfully, check `C:\UPS_Reports\<today's date>\` for
5 CSV files (one per center).

## Step 6: Schedule it (only after Step 5 works cleanly)
Once we've confirmed the test run works, I'll walk you through setting up
Windows Task Scheduler to run this automatically Monday–Friday. Don't set
this up until Step 5 is confirmed working.
