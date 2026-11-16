/* Run on each TCGplayer grid search page (view=grid). Accumulates into localStorage 'tpx'.
   Pages used (add &page=2,3...):
   /search/riftbound-league-of-legends-trading-card-game/<set>?productLineName=riftbound-league-of-legends-trading-card-game&setName=<set>&view=grid&RarityName=Showcase|Signature|Ultimate&ProductTypeName=Cards
   for set in origins, spiritforged, unleashed, vendetta. Clear first with localStorage.removeItem('tpx'). */
await new Promise(r => setTimeout(r, 4000));
const st = JSON.parse(localStorage.getItem('tpx') || '{}'); let n = 0;
document.querySelectorAll('.search-result').forEach(e => {
  const t = e.innerText.split('\n').map(s => s.trim()).filter(Boolean);
  const set = t.find(s => /^(Origins|Spiritforged|Unleashed|Vendetta)$/.test(s)); if (!set) return;
  const num = (t.find(s => /#/.test(s)) || '').match(/#(\S+)/)?.[1];
  const name = t.find(s => /\(/.test(s) && !/#/.test(s)) || t[2];
  const mp = (t.find(s => /Market Price/.test(s)) || '').replace(/[^0-9.]/g, '');
  const low = (t[t.findIndex(s => /listings from/.test(s)) + 1] || '').replace(/[^0-9.]/g, '');
  const pid = e.querySelector('a')?.href.match(/product\/(\d+)/)?.[1];
  st[pid] = [set[0], num, name, mp, low]; n++;
});
localStorage.setItem('tpx', JSON.stringify(st));
n + ' kept total ' + Object.keys(st).length + ' ' + (document.body.innerText.match(/\d+ results/)?.[0] || '')
