"""Build site/data/cards.json and update site/data/history.json from the weekly raw files.

Inputs (raw/):
  pop_<set>.txt   PSA pop rows: number~name~variant~psa9~psa10~total
  tcg.txt         TCGplayer: setLetter number market lowest productId
  ebay*.txt       matched eBay PSA sold comps: KEY:<g><MMDD>-<price>[x][-itemId] ...
Run: python3 scripts/build_data.py --date 2026-11-15
"""
import argparse, json, os, re, statistics
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw')
OUT = os.path.join(ROOT, 'site', 'data')

SETS = {
    'ogn': dict(name='Origins', letter='O', psa='https://www.psacard.com/pop/tcg-cards/2025/riftbound-league-legends-ogn-origins/321586', total='298'),
    'sfd': dict(name='Spiritforged', letter='S', psa='https://www.psacard.com/pop/tcg-cards/2026/riftbound-league-legends-sfd-spiritforged/330812', total='221'),
    'unl': dict(name='Unleashed', letter='U', psa='https://www.psacard.com/pop/tcg-cards/2026/riftbound-league-legends-unl-unleashed/338987', total='219'),
    'ven': dict(name='Vendetta', letter='V', psa='https://www.psacard.com/pop/tcg-cards/2026/riftbound-league-legends-ven-vendetta/347862', total='166'),
}
VARIANT = {'ON': 'Overnumbered', 'SIG': 'Signature', 'SP': 'Special (SP)', 'UR': 'Ultimate'}


def parse_ebay(run_date):
    sales = {}
    for fn in sorted(os.listdir(RAW)):
        if not fn.startswith('ebay'):
            continue
        for line in open(os.path.join(RAW, fn)):
            line = line.strip()
            if not line:
                continue
            key, _, rest = line.partition(':')
            for tok in rest.split():
                m = re.match(r'([ab])(\d\d)(\d\d)-(\d+)(x?)(?:-(\d+))?$', tok)
                if not m:
                    continue
                g, mm, dd, price, bo, item = m.groups()
                yr = run_date.year if (int(mm), int(dd)) <= (run_date.month, run_date.day) else run_date.year - 1
                d = date(yr, int(mm), int(dd))
                if d < run_date - timedelta(days=90):
                    continue
                sales.setdefault(key, []).append(dict(g=10 if g == 'a' else 9, d=d.isoformat(), p=int(price),
                                                      bo=bool(bo), id=item))
    return sales


def clean(lst):
    """Drop obvious mismatches: prices far from the card/grade median (wrong variant, lots, typos)."""
    if len(lst) < 4:
        return lst, []
    med = statistics.median(s['p'] for s in lst)
    keep = [s for s in lst if med / 2.5 <= s['p'] <= med * 2.5]
    drop = [s for s in lst if s not in keep]
    return keep, drop


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--date', default=date.today().isoformat())
    a = ap.parse_args()
    run = date.fromisoformat(a.date)

    tcg = {}
    for line in open(os.path.join(RAW, 'tcg.txt')):
        L, num, mp, low, pid = line.split()
        tcg[(L, num.replace('S', '*') if not num.startswith('SP') else num)] = (float(mp), float(low), pid)

    sales = parse_ebay(run)
    cards = []
    for code, s in SETS.items():
        for line in open(os.path.join(RAW, f'pop_{code}.txt')):
            no, name, var, p9, p10, tot = line.strip().split('~')
            if var == 'AA':
                continue
            key = f"{code.upper()}-{no.replace('*', 'S')}"
            mp, low, pid = tcg.get((s['letter'], no), (None, None, None))
            ss = sorted(sales.get(key, []), key=lambda x: x['d'], reverse=True)
            g10, d10 = clean([x for x in ss if x['g'] == 10])
            g9, d9 = clean([x for x in ss if x['g'] == 9])
            champ, _, sub = name.partition(' - ')
            q = f"riftbound {champ} {sub} {no.rstrip('*')} psa".replace("'", '')
            if var == 'SIG':
                q = q.replace(' psa', ' signature psa')
            cards.append(dict(
                id=key, set=s['name'], setCode=code.upper(), number=f"{no}/{s['total']}" if not no.startswith('SP') else no,
                name=name, variant=VARIANT[var],
                raw=dict(market=mp, low=low),
                pop=dict(psa10=int(p10), psa9=int(p9), total=int(tot)),
                sales=sorted(g10 + g9, key=lambda x: x['d'], reverse=True),
                excluded=len(d10) + len(d9),
                links=dict(
                    tcgplayer=f'https://www.tcgplayer.com/product/{pid}' if pid else None,
                    psa=s['psa'],
                    ebaySold='https://www.ebay.com/sch/i.html?_nkw=' + q.replace(' ', '+') + '&LH_Sold=1&LH_Complete=1&_sop=13',
                ),
            ))

    os.makedirs(OUT, exist_ok=True)
    json.dump(dict(updated=run.isoformat(), windowDays=90, cards=cards),
              open(os.path.join(OUT, 'cards.json'), 'w'), separators=(',', ':'))

    hp = os.path.join(OUT, 'history.json')
    hist = json.load(open(hp)) if os.path.exists(hp) else {}
    for c in cards:
        h = hist.setdefault(c['id'], [])
        h[:] = [x for x in h if x['d'] != run.isoformat()]
        h.append(dict(d=run.isoformat(), psa10=c['pop']['psa10'], psa9=c['pop']['psa9'], total=c['pop']['total'],
                      raw=c['raw']['market']))
        h.sort(key=lambda x: x['d'])
    json.dump(hist, open(hp, 'w'), separators=(',', ':'))
    n_sales = sum(len(c['sales']) for c in cards)
    print(f"{len(cards)} cards, {n_sales} comps kept, {sum(c['excluded'] for c in cards)} outliers excluded")


if __name__ == '__main__':
    main()
