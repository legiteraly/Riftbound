/* Turn matched sales into the compact raw/ebay*.txt format and show them on the page in two chunks for get_page_text.
   Set RUN (today) and FROM (today - 90 days) first. After reading chunk 1, run:
   document.getElementById('o').textContent = REST   and read again. */
const RUN = '2026-11-15', FROM = '2026-08-17', CUT30 = '2026-10-16';
const M = JSON.parse(localStorage.getItem('m')); const g = {};
for (const m of M) {
  if (m[3] < FROM) continue;
  let p = m[2]; if ((p.match(/\./g) || []).length > 1) { p = Math.min(...p.match(/\d+\.\d\d/g).map(Number)); }
  p = Math.round(+p); const md = m[3].slice(5).replace('-', '');
  (g[m[0]] = g[m[0]] || []).push((m[1] == '10' ? 'a' : 'b') + md + '-' + p + (m[4] ? 'x' : '') + (m[3] >= CUT30 ? '-' + m[5] : ''));
}
const L = Object.keys(g).sort().map(k => k + ':' + g[k].join(' '));
let a = [], n = 0, i = 0; for (; i < L.length && n < 26500; i++) { a.push(L[i]); n += L[i].length + 1; }
window.REST = L.slice(i).join('\n');
document.body.innerHTML = '<main><article><pre id="o"></pre></article></main>';
document.getElementById('o').textContent = a.join('\n');
L.length + ' cards, chunk 1 has ' + i
