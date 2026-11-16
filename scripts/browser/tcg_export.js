/* After all TCGplayer pages: print "L num market low productId" for chase numbers (above the set size, or SP#).
   Signature numbers come out as e.g. 299S. Read E in slices of ~30 lines. */
const st = JSON.parse(localStorage.getItem('tpx')); const base = { O: 298, S: 221, U: 219, V: 166 };
window.E = Object.entries(st).filter(([p, v]) => { const no = (v[1] || '').split('/')[0]; return /^SP/.test(no) || parseInt(no) > base[v[0]]; })
  .map(([p, v]) => [v[0], v[1].split('/')[0].replace('*', 'S'), v[3], v[4], p].join(' ')).sort();
E.length + ' rows'
