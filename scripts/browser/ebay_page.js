/* eBay sold search, newest first, 240/page:
   https://www.ebay.com/sch/i.html?_nkw=riftbound+psa&LH_Sold=1&LH_Complete=1&_ipg=240&_sop=13
   First page: run localStorage.removeItem('eb') before this. Each run stores the page and then moves to the
   next page by itself; call it again until "last" is more than 90 days before today (about 30 pages). */
for (let i = 0; i < 20 && document.querySelectorAll('li.s-card').length < 50; i++) await new Promise(r => setTimeout(r, 300));
const st = JSON.parse(localStorage.getItem('eb') || '{}'); let n = 0, last = '';
document.querySelectorAll('li.s-card').forEach(e => {
  const t = e.innerText.split('\n').map(s => s.trim()).filter(Boolean);
  const d = t.find(s => /^Sold /.test(s)); if (!d) return;
  const id = e.querySelector('a[href*="/itm/"]')?.href.match(/itm\/(\d+)/)?.[1]; if (!id || id == '123456') return;
  const title = t[t.indexOf(d) + 1];
  const pi = t.findIndex(s => /^\$[\d,.]+/.test(s)); const price = pi >= 0 ? t[pi].replace(/[^0-9.]/g, '') : '';
  const bo = e.querySelector('.strikethrough') ? 1 : 0;
  last = new Date(d.replace('Sold ', '')).toISOString().slice(0, 10);
  st[id] = [last, price, bo, title]; n++;
});
localStorage.setItem('eb', JSON.stringify(st));
const pg = +new URL(location.href).searchParams.get('_pgn') || 1;
if (n > 0) setTimeout(() => { const u = new URL(location.href); u.searchParams.set('_pgn', pg + 1); location.href = u.toString(); }, 200);
'pg ' + pg + ': ' + n + ' items, total ' + Object.keys(st).length + ', last ' + last
