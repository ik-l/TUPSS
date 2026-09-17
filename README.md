# TUPSS Fitness Tracker

Phase 1 of the fitness tracker web app (per the build spec). It runs entirely in the browser — no backend, no build step. Your food log, weights, favorites, and photos are stored locally on whatever device/browser you use (localStorage + IndexedDB), so they stay on that device and don't sync anywhere else.

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

## What's included (Phase 1, all 11 features from the spec)

1. Manual food logging — name, calories, protein, carbs, fat, sodium, sugar, meal type, timestamp
2. Barcode scanner (device camera) with Open Food Facts lookup, manual entry fallback if not found
3. Daily dashboard — running totals vs. targets (1,900 cal / 150g protein), meals grouped by breakfast/lunch/dinner/snack
4. Alerts — flags any single item over 800mg sodium or 25g sugar
5. Restaurant swap suggestions for In-N-Out, Chick-fil-A, taco shop (carne asada fries), and Pho
6. Weight tracking — log entries, trend chart, progress toward your 208 lb goal
7. Manual steps/standing time entry, shown on the dashboard
8. Quick-log favorites — save a specific regular order as a one-tap log
9. Streak counter for consecutive days with at least one logged meal
10. Optional midday meal reminder
11. Optional photo attached to a logged meal

Settings (targets, alert thresholds, reminder time, starting/goal weight) are all editable in the Settings tab.

## Known limitations (by design, for v1)

- **No sync/backup.** Data lives only in the browser you're using. Clearing browser data, or switching devices/browsers, loses it. (CSV export is planned for Phase 2.)
- **Reminder only fires while the tab is open.** There's no backend or push service yet, so it's a nudge while you're in the app, not a guaranteed phone notification. True background notifications need the Phase 3 native app.
- **Barcode lookup depends on Open Food Facts having the product.** If it's not in their database, you'll fall back to manual entry.
- I wasn't able to test the live camera scan or the real Open Food Facts network call from inside the build environment — its network policy blocks those two external domains. Everything else (logging, alerts, swap suggestions, weight chart, favorites, streak, photos, settings, reset) was tested end-to-end with a headless browser and works correctly. The scanner and lookup code follow Open Food Facts' documented API and have a tested manual-entry fallback if either ever fails — please try scanning a real barcode once you open the app in a normal browser, and let me know if anything looks off.

## Next up (Phase 2, later)

Custom/homemade recipes, weekly/monthly trend charts, Nutri-Score/NOVA display, water tracking, CSV export, more restaurants.
