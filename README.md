# TUPSS Fitness Tracker

Phase 1 and Phase 2 of the fitness tracker web app (per the build spec) are complete. It runs entirely in the browser — no backend, no build step. Your food log, weights, favorites, and photos are stored locally on whatever device/browser you use (localStorage + IndexedDB), so they stay on that device and don't sync anywhere else.

The app lives in the `docs/` folder (named that specifically so GitHub Pages — see below — can serve it with zero extra config).

## Using it on your phone (recommended way to actually use it)

This needs HTTPS for the camera barcode scanner to work, so the easiest path is free hosting via **GitHub Pages**:

1. On GitHub, open this repo → **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment" → Source, choose **Deploy from a branch**.
3. Branch: pick `claude/fitness-tracker-build-spec-u0mdkz` (or `main`, once this is merged), folder: **/docs**. Click **Save**.
4. Wait a minute or two, then refresh that Settings page — it'll show a live link like `https://ik-l.github.io/TUPSS/`. Open that link on your phone (bookmark it, or add it to your home screen from the browser's share menu so it feels like an app).

Everything (logging, alerts, weight chart, favorites, streak) works the same as a local run — the only thing HTTPS unlocks is the camera scanner.

## Previewing it on your computer first

Because the app uses ES modules, open it through a local web server rather than double-clicking `index.html`. From the `docs/` folder:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser. The barcode scanner won't work here (no HTTPS), but everything else will — good for a quick look before setting up Pages.

## What's included

**Phase 1**
1. Manual food logging — name, calories, protein, carbs, fat, sodium, sugar, meal type, timestamp
2. Barcode scanner (device camera) with Open Food Facts lookup, manual entry fallback if not found
3. Daily dashboard — circular macro ring (calories/carbs/fat/protein), protein goal bar, meals grouped by breakfast/lunch/dinner/snack, with day navigation (‹ Today ›) to browse past days
4. Alerts — flags any single item over 800mg sodium or 25g sugar
5. Restaurant swap suggestions — In-N-Out, Chick-fil-A, taco shop (carne asada fries), Pho, Starbucks, Chipotle, Subway, Taco Bell, Panda Express, Wendy's, McDonald's, Panera
6. Weight tracking — log entries, trend chart, progress toward your 208 lb goal
7. Manual steps/standing time entry, per day, shown on the dashboard
8. Quick-log favorites — save a specific regular order as a one-tap log
9. Streak counter for consecutive days with at least one logged meal
10. Optional midday meal reminder + optional snack/fruit reminder (separately timed)
11. Optional photo attached to a logged meal

**Phase 2**
- Recipes — build a custom/homemade meal from multiple ingredient rows on the Favorites tab; it sums the macros and saves as a one-tap favorite
- Weekly/monthly trend charts — Progress tab has a 7-day/30-day toggle for calories, protein, and steps, plus the weight trend
- Nutri-Score (A–E) and NOVA processing-level badges on barcode-scanned items, shown in the Log form and Dashboard
- Water intake tracking — daily goal (default 100oz) with quick +8/+16/+24oz buttons
- CSV export of your food log, weight, and steps/water data (Settings tab) — and CSV *import* from another tracker's export
- Health History card (Progress tab) — static charts (steps by month, resting heart rate, HRV) built from a provided Apple Health export summary, plus a few flagged trends/gaps (not a live sync — see limitations)

Settings (targets, alert thresholds, reminder times, starting/goal weight, water target) are all editable in the Settings tab.

## Known limitations (by design)

- **No sync/backup.** Data lives only in the browser you're using. Clearing browser data, or switching devices/browsers, loses it. Use the CSV export in Settings to back up or move data manually.
- **Reminders only fire while the tab is open.** There's no backend or push service, so they're a nudge while you're in the app, not a guaranteed phone notification. True background notifications need the Phase 3 native app.
- **Barcode lookup depends on Open Food Facts having the product**, including whether it has Nutri-Score/NOVA data at all — many products don't.
- **Health History is a static snapshot**, not a live Apple Health sync — that requires the native iOS app (Phase 3). Update it by sharing a new Apple Health export summary.
- I wasn't able to test the live camera scan or the real Open Food Facts network call from inside the build environment — its network policy blocks those two external domains. Everything else was tested end-to-end with a headless browser and works correctly. Please try a real barcode scan once you're on the live site, and let me know if anything looks off.

## Not built (Phase 3 — explicitly out of scope for now)

Native iOS app with real Apple Health read/write sync (auto-pulled steps/standing time, nutrition written back to Health). Needs Xcode, an Apple Developer account, and a lot more build time — only worth it once the web app is proven useful day-to-day.
