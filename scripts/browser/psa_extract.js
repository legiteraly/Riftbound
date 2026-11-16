/* Run on a PSA pop set page (e.g. .../riftbound-league-legends-ogn-origins/321586) after the table loads.
   Keeps Overnumber, Signature Overnumber, SP (Crystal Rose etc.) and Ultimate rows.
   Output lines: number~name~variant~psa9~psa10~total  (variant: ON | SIG | SP | UR)
   Output is limited to ~1000 chars per call, so read window.OUT in slices: OUT.slice(0,25).join('\n') etc. */
await new Promise(r => setTimeout(r, 3000));
const n = s => parseInt((s || '0').replace(/,/g, '')) || 0;
const rows = [...document.querySelectorAll('table tbody tr')].slice(1).map(r => {
  const c = [...r.children]; const f = x => (x?.innerText || '').split('\n')[0].trim();
  const nm = c[2].innerText.split('\n').map(s => s.trim()).filter(s => s && s !== 'Shop with Affiliates');
  const g = c.slice(4).map(f); // AUTH,1,1.5,2..8,9,10,TOTAL
  return { no: f(c[1]), name: nm[0], v: nm.slice(1).join('/'), p9: n(g[10]), p10: n(g[11]), t: n(g[12]) };
});
const kind = r => /Signature Overnumber/.test(r.v) ? 'SIG' : /Overnumber/.test(r.v) ? 'ON' : /Ultimate/.test(r.v) ? 'UR' : /^SP\d/.test(r.no) ? 'SP' : null;
window.OUT = rows.filter(r => kind(r) && !/Rune/.test(r.name)).map(r => [r.no, r.name, kind(r), r.p9, r.p10, r.t].join('~'));
OUT.length + ' chase rows'
