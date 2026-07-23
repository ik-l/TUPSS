# TUPSS BCG Compliance Automation — Claude Code Project Brief

## Overview
Five UPS Store centers (0007, 3606, 6822, 6964, 7177) must maintain USPS PS1583 BCG compliance. Every active mailbox holder — each person, joint holder, and business separately — needs a PS1583 uploaded to the BCG portal. Certification deadline is the 15th of each month. This project automates the full cycle: pulling data, cross-checking compliance, updating a live dashboard, and pushing results to Trello and Netlify.

---

## Architecture — Three Agents

### Agent 1: FRS Puller
Runs on schedule (9:00 AM weekdays, Windows Task Scheduler). Uses Playwright to log into the FRS portal and download Box Holder List CSVs for all 5 centers.

### Agent 2: BCG Analyzer
Triggered manually each month (1st–15th). Accepts MPS CSVs + BCG quarterly review exports, cross-checks compliance, builds tracker xlsx files per center.

### Agent 3: Dashboard Updater
Triggered after Agent 1 (mid-cycle) or Agent 2 (full cycle). Updates bcg_dashboard.html and run_bcg_update.ps1 with new numbers, then runs the PS1 script to push to Trello + Netlify.

---

## Agent 1: FRS Puller

### URLs
- Login: `https://frs.theupsstore.com/Framework/SignIn.aspx`
- Report: `https://frs.theupsstore.com/UI/Reporting/Mailbox/BoxHolderList.aspx`

### Login credentials
Stored in `C:\Users\ikevi\Desktop\config.env` — never hardcoded. Format:
```
LOGIN1_USER=RCWilson
LOGIN1_PASS=...
LOGIN2_USER=JBURNHAM
LOGIN2_PASS=...
```

### Workflow
1. Login as RCWilson
2. For each center [3606, 6822, 6964, 7177]:
   - Navigate to Box Holder List
   - Select center from dropdown
   - Set Agreement Status = "New And Active"
   - Click Go, wait for results
   - Click export icon → CSV (comma delimited) → auto-downloads
3. Sign out
4. Login as JBURNHAM
5. Export center 7 (same steps)
6. Move all CSVs to `C:\UPS_Reports\<YYYY-MM-DD>\`
7. Delete folders older than 5 days

### Page element notes (verified from live site)
- Center dropdown opens list: 3606, 6822, 6964, 7177 (RCWilson) or 7 (JBURNHAM)
- Agreement Status dropdown options: All, New, Active, Inactive, New And Active — select "New And Active"
- Export icon is a floppy disk/download icon in the report toolbar
- CSV downloads automatically with no save dialog

### Schedule
- 9:00 AM Mon–Fri via Windows Task Scheduler
- Machine will be on and logged in
- "Wake to run" not needed

### Error handling
- If login fails: write to `C:\UPS_Reports\errors.log`, stop, do not proceed
- If a center returns no rows: log warning, continue to next center
- If CSV doesn't appear in Downloads within 30s: retry once, then log and continue

---

## Agent 2: BCG Analyzer (Monthly, 1st–15th)

### Inputs per cycle
1. Five MPS Box Holder List CSVs (one per center) — from Agent 1 or manual drop
2. Five BCG quarterly review exports (.xls, HTML format) — pulled manually from CMRA portal

### Data rules (always apply)
- **Entity counting**: every row = one PS1583-required entity. Each person (P/J type), each business (non-empty BusinessName) counted separately. Joint holders each count separately.
- **Minors**: never appear, never flagged, excluded entirely.
- **Junk boxes**: exclude BoxNumber 7777, 9999, 1010 from everything.
- **Keep** real holders with unusual names (e.g. "Aguilar Pick Up Only").
- **Agreement Status filter**: include Active AND New (New holders need PS1583s too).
- **BCG filtered count** = Current + New entries (the "filtered from X total" number in BCG footer).
- **Matching rule**: box number + name. Never name alone. Fuzzy-ignore suffixes (JR, SR, LLC, INC, CORP). Person confirmed stale only when no first or last name match exists in that box. Last-name-only matches → yellow review rows.
- **Cards metric** = Card On File + House Account billing options combined.
- **Delete raw exports** after each cycle per TUPSS QRG data-security guidance.

### Output per center: three-tab xlsx
**Tab 1 — Summary**
- Total PMB entities, missing from BCG with %, people missing, businesses missing, mailbox overdue count, stale entries (confirmed + review), cards on file + house accounts with %

**Tab 2 — BCG Tracker {store}**
- Official TUPSS uspsbcg-tracker template format (teal checklist headers, light-blue checklist cells, merged cell structure preserved)
- All MPS rows included
- Readiness column pre-filled Yes/No by cross-check
- Upload columns marked Yes/N/A for rows already in BCG
- Notes: "Pending in MPS", "Mailbox Overdue" as applicable
- Never include a "Verified at Center Visit" column

**Tab 3 — Remove from BCG (After)**
- Stale BCG entries only
- Columns: PMB, Type, Name in BCG, Business in BCG, BCG Status, Confirmed Gone?, Terminated in BCG?, Date Completed, Notes
- Yellow rows = first-name-mismatch review cases

---

## Agent 3: Dashboard Updater

### Files
- `C:\Users\ikevi\OneDrive\Desktop\TUPSS Cowork\Trello Automation - TUPSS x BCG\bcg_dashboard.html`
- `C:\Users\ikevi\OneDrive\Desktop\TUPSS Cowork\Trello Automation - TUPSS x BCG\run_bcg_update.ps1`

### Center data (current as of 2026-07-02)
```javascript
{ store:'7',    pmb:385, bcg:335, cards:17 }
{ store:'3606', pmb:757, bcg:712, cards:25 }
{ store:'6822', pmb:213, bcg:201, cards:5  }
{ store:'6964', pmb:217, bcg:219, cards:11 }
{ store:'7177', pmb:415, bcg:374, cards:8  }
```

### Trello IDs (do not change)
```
Center 7:    cardId=6a1faa79677d65ad42f436e1  itemId=6a1faa7a677d65ad42f4371c
Center 3606: cardId=6a1fadaa06ba961514ded7e1  itemId=6a1fadaa06ba961514ded81c
Center 6822: cardId=6a1e3f55d3b5367023f00612  itemId=6a1e3f55d3b5367023f0064b
Center 6964: cardId=6a1fa76ddc47ca7e49878d34  itemId=6a1fa76ddc47ca7e49878d6f
Center 7177: cardId=6a1fa5eb339ee1fcf2112488  itemId=6a1fa5eb339ee1fcf21124c3
```

### API keys (treat as read-only config — never expose in logs)
```
Trello key:    993f52d5251c5bcb140abd564640448e
Trello token:  ATTA49c0a050f00619bd5865be62073abef51809dd0bf485783dc017e04a5593fd59FEC06CC9
Netlify token: nfp_a3NvR2EZL4TBvhXV7Rv9yU7m5pxRWaXa4575
Netlify siteId: 150ea733-da70-4351-abac-51393c06506b
Netlify URL:   https://gentle-frangollo-d9ae46.netlify.app
```

### Update modes

**Mid-cycle (after 15th):** MPS CSVs only + BCG footer lines
- Recalculate pmb and cards from CSVs
- Update bcg from footer ("Showing X of Y entries (filtered from Z total)" — use X)
- Update lastSnapshot, lastUpdate, thisUpdate timestamps
- No tracker rebuild

**Full cycle (1st–15th):** MPS CSVs + BCG xls exports
- Run Agent 2 first (tracker files)
- Then update dashboard with fresh pmb, bcg, cards
- Add true_missing per center from cross-check results (actual people/businesses not in BCG, separate from PMB minus BCG which is skewed by stale entries)

### Dashboard rules
- Certification banner visible 1st–15th: "Full review window open — Certify in BCG by [Month] 15. X days remaining." Orange styling. Auto-hides after 15th.
- Priority action banner: always visible, shows top 2 centers by missing count
- Cards metric = Card On File + House Account combined
- True missing metric = from cross-check, not PMB minus BCG

### After updating files
Run `run_bcg_update.ps1` (right-click → Run with PowerShell). This:
1. Updates all 5 Trello checklist items with new counts
2. Deploys bcg_dashboard.html to Netlify automatically

---

## Future: Center 8122
Not yet active. Add when open using same format. Login assignment TBD.

---

## What requires human action (IKL)
- Pulling BCG quarterly review .xls from CMRA portal (no API)
- Running run_bcg_update.ps1 after dashboard update
- Working the "No" rows and uploading PS1583s in BCG
- Certifying in BCG by the 15th
- Filling in config.env with credentials (never share with any chat)
