# Weekly update (Thursdays)

Run by Claude in the user's Chrome (signed-in browser). Take it slow; don't fight blocks or CAPTCHAs —
if a site blocks, stop, keep last week's file for that source and note it in the commit message.

Set `RUN` = today, `FROM` = today − 90 days, `CUT30` = today − 30 days.

## 1. PSA population (≈4 page loads)

Open each set page and run `scripts/browser/psa_extract.js`; read `OUT` in slices and save to `raw/pop_<set>.txt`.

| file | page |
|---|---|
| pop_ogn.txt | https://www.psacard.com/pop/tcg-cards/2025/riftbound-league-legends-ogn-origins/321586 |
| pop_sfd.txt | https://www.psacard.com/pop/tcg-cards/2026/riftbound-league-legends-sfd-spiritforged/330812 |
| pop_unl.txt | https://www.psacard.com/pop/tcg-cards/2026/riftbound-league-legends-unl-unleashed/338987 |
| pop_ven.txt | https://www.psacard.com/pop/tcg-cards/2026/riftbound-league-legends-ven-vendetta/347862 |

Check for new chase cards (new overnumbered/SP rows, reprints). New cards are picked up automatically once they're in the pop files.

## 2. TCGplayer raw prices (≈12 page loads)

`localStorage.removeItem('tpx')`, then for each set (origins, spiritforged, unleashed, vendetta) and each page
(`&page=1,2,3`) open the grid search URL in `tcg_grab.js` and run it. Then run `tcg_export.js` and save `E`
to `raw/tcg.txt`. Every chase card in the pop files should have a line.

## 3. eBay sold PSA 9/10 (≈30 page loads)

1. Open the sold search in `ebay_page.js`, run `localStorage.removeItem('eb')`, then run `ebay_page.js`
   repeatedly until `last` is older than `FROM`.
2. `python3 scripts/make_classifier.py`, paste `scripts/browser/ebay_classify.js` into the tab.
3. Run `window.DEF=<raw/defs.json>;` then `ebay_pass2.js`.
4. Spot-check ~20 matched titles against their keys.
5. Edit RUN/FROM/CUT30 in `ebay_export.js`, run it, `get_page_text`, save to `raw/ebay1.txt`;
   set the page to `REST`, read again, save to `raw/ebay2.txt`.

## 4. Build and publish

```
python3 scripts/build_data.py --date $RUN
python3 scripts/build_preview.py   # optional: render preview/index.html and look at it
git add raw site/data && git commit -m "Weekly data $RUN" && git push
```

`history.json` keeps one row per card per week; never delete old rows — the graphs depend on them.
