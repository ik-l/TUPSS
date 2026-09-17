# TUPSS Fitness Tracker

Phase 1 of the fitness tracker web app (per the build spec). It runs entirely in the browser — no backend, no build step. Your food log, weights, favorites, and photos are stored locally on whatever device/browser you use (localStorage + IndexedDB), so they stay on that device and don't sync anywhere else.

The app lives in the `app/` folder.

## Running it

Because the app uses ES modules, open it through a local web server rather than double-clicking `index.html`. From the `app/` folder:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Using it on your phone (for the barcode scanner)

Phones block camera access on a page loaded over plain `http://` from another machine. To scan barcodes on your phone, either:
- Deploy the `app/` folder as a static site (GitHub Pages, Netlify, Vercel — all free, no server code required), or
- Serve it from `localhost` on the phone itself.

Everything else in the app works fine without HTTPS — you'd just enter nutrition info manually instead of scanning.

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
