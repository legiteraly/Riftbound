# Riftbound Grading EV · PSA

A static website that shows the expected value (EV) of buying a raw Riftbound card and grading it at PSA.
Users can search any tracked card or browse the top 50 by EV. Data refreshes every Thursday.

**Cards tracked:** overnumbered, signature, SP and ultimate cards from Origins, Spiritforged, Unleashed and Vendetta
(143 cards). Radiance is excluded for now (too new for reliable sold data).

## How EV is calculated

For each card, with the user's own settings (defaults in brackets):

| Input | Source |
|---|---|
| Chance of PSA 10 / PSA 9 / 8-or-lower | This card's PSA population (PSA 10 ÷ total, PSA 9 ÷ total). Blended with the set + variant average, weighted as 10 extra copies, so cards with few graded copies don't swing to 0% or 100%. |
| PSA 10 value | Median eBay sold price for PSA 10, last 30 days if there are 3+ sales, otherwise last 90 days |
| PSA 9 value | Same for PSA 9, but never less than raw: a 9 can be cracked and sold raw |
| PSA 8 or lower | Raw price (crack and sell raw) |
| Raw price | TCGplayer market price |
| Grading fee | User setting [$40/card] |
| Shipping to PSA | User setting [$1/card] |
| Selling fee | User setting [eBay 11%; in person 10–20%] |
| Value drop | User setting [25%], covering the ~80–90 day PSA bulk turnaround |

```
keep      = (1 − value drop) × (1 − selling fee)
proceeds  = P10 × V10 × keep + P9 × max(V9, raw) × keep + Plow × raw × keep
EV        = proceeds − raw − grading fee − shipping
ROI       = EV ÷ (raw + grading fee + shipping)
```

**Evidence: Thin** = fewer than 5 PSA 10 sales in the last 90 days. The badge links to the eBay sold search so users can
check the comps themselves. Cards with no PSA 10 sales get no EV and are left out of the top 50.

eBay sales more than 2.5× above or below the card's median for that grade are dropped as likely mismatched listings
(wrong variant, lots, typos); each card page says how many were dropped.

## Repo layout

```
site/                 the website (deployed to GitHub Pages)
  index.html styles.css app.js ev.js
  data/cards.json     current snapshot (rebuilt weekly)
  data/history.json   weekly PSA pop + raw price history (appended weekly; feeds the graphs)
raw/                  this week's collected data (pop_*.txt, tcg.txt, ebay*.txt)
scripts/build_data.py builds site/data from raw/
scripts/build_preview.py  bundles the site into one HTML file for previewing
scripts/browser/      snippets used in the browser during the weekly collection
RUNBOOK.md            the weekly Thursday update, step by step
```

## Run locally

```
python3 scripts/build_data.py --date 2026-11-15
cd site && python3 -m http.server 8000   # open http://localhost:8000
```

## Hosting

GitHub Pages via `.github/workflows/pages.yml`. In the repo: Settings → Pages → Source: **GitHub Actions**.
