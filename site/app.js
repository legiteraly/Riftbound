/* Riftbound Grading EV — static single-page app. Data: data/cards.json + data/history.json */
(function () {
  const E = window.RiftEV;
  const $app = document.getElementById('app');
  const S = { data: null, hist: {}, pri: null, opts: loadOpts(), filt: { set: '', variant: '', hideThin: false, sort: 'ev', col: 'rank', dir: 1 } };

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (v, d = 0) => v == null ? '—' : (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 0) => { if (v == null) return '—'; const t = (v * 100).toFixed(d); return (/^-0(\.0+)?$/.test(t) ? t.slice(1) : t) + '%'; };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const signUsd = (v) => { if (v == null) return '—'; v = Math.round(v); return (v > 0 ? '+' : '') + usd(v === 0 ? 0 : v); };
  const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const shortDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  function loadOpts() { let o; try { o = Object.assign({}, E.DEFAULTS, JSON.parse(localStorage.getItem('riftev-opts') || '{}')); } catch (e) { o = Object.assign({}, E.DEFAULTS); }
    o.sellMode = 'ebay'; o.customSellFee = null; return applySellMode(o); } // every visit starts on eBay 11%
  function applySellMode(o) { o.sellFee = o.sellMode === 'custom' ? o.customSellFee : E.DEFAULTS.sellFee; return o; }
  function saveOpts() { try { const { sellMode, customSellFee, sellFee, ...keep } = S.opts; localStorage.setItem('riftev-opts', JSON.stringify(keep)); } catch (e) { /* storage unavailable */ } }
  const evalCard = (c) => E.evaluate(c, S.opts, S.pri, S.data.updated);
  const byId = (id) => S.data.cards.find((c) => c.id === id);
  const evCls = (v) => v == null || Math.round(v) === 0 ? '' : v > 0 ? 'pos' : 'neg';

  function evidenceBadge(c, r) {
    if (r.v10.n90 === 0) return `<a class="badge none" href="${esc(c.links.ebaySold)}" target="_blank" rel="noopener" title="No PSA 10 sales found in 90 days — check eBay yourself">No PSA 10 sales</a>`;
    if (r.thin) return `<a class="badge thin" href="${esc(c.links.ebaySold)}" target="_blank" rel="noopener" title="Fewer than ${S.opts.thinMin} PSA 10 sales in 90 days — open the sold listings to check">Evidence: Thin</a>`;
    return `<span class="badge ok">${plural(r.v10.n90, 'PSA 10 sale')}</span>`;
  }

  // ---------- load ----------
  async function load() {
    if (window.RIFT_DATA) { S.data = window.RIFT_DATA.cards; S.hist = window.RIFT_DATA.history; }
    else {
      const [c, h] = await Promise.all([fetch('data/cards.json').then((r) => r.json()), fetch('data/history.json').then((r) => r.json()).catch(() => ({}))]);
      S.data = c; S.hist = h;
    }
    S.pri = E.priors(S.data.cards);
    document.getElementById('updated').innerHTML = `Data as of <b>${fmtDate(S.data.updated)}</b><br><span class="note">Refreshes every Thursday</span>`;
    window.addEventListener('hashchange', route);
    route();
  }

  function route() {
    const m = location.hash.match(/^#card-([A-Za-z0-9-]+)$/);
    if (m && byId(m[1])) renderCard(byId(m[1])); else renderHome();
    window.scrollTo(0, 0);
  }

  // ---------- assumptions panel ----------
  function assumptionsHTML() {
    const o = S.opts;
    const custom = o.sellMode === 'custom';
    return `<div class="panel"><div class="panel-head"><h2>Your costs &amp; assumptions</h2><button class="reset" id="o-reset" type="button">Reset to defaults</button></div>
    <div class="assume">
      <div><label for="o-fee">PSA grading fee / card</label><input id="o-fee" type="number" min="0" step="1" value="${o.gradingFee}"><div class="hint">Your PSA service level</div></div>
      <div><label for="o-ship">Shipping cost to PSA / card</label><input id="o-ship" type="number" min="0" step="0.5" value="${o.shipping}"><div class="hint">Bulk shipping split per card</div></div>
      <div><label for="o-sellp">Where you sell</label><select id="o-sellp"><option value="ebay" ${custom ? '' : 'selected'}>eBay (11%)</option><option value="custom" ${custom ? 'selected' : ''}>In person / custom</option></select><div class="hint">Pick custom to set your own fee</div></div>
      <div><label for="o-sell">Selling fee %</label><input id="o-sell" type="number" min="0" max="50" step="0.5" inputmode="decimal"><div class="hint" id="o-sell-hint"></div></div>
      <div><label for="o-drop">Value drop during grading %</label><input id="o-drop" type="number" min="0" max="90" step="1" value="${o.valueDrop}"><div class="hint">PSA bulk takes ~80–90 days</div></div>
    </div></div>`;
  }
  // Keep the selling-fee box in step with the dropdown without redrawing the panel.
  function syncSellUI() {
    const o = S.opts, box = document.getElementById('o-sell'), hint = document.getElementById('o-sell-hint'), sel = document.getElementById('o-sellp');
    if (!box) return;
    const custom = o.sellMode === 'custom';
    sel.value = custom ? 'custom' : 'ebay';
    box.disabled = !custom;
    box.value = custom ? (o.customSellFee == null ? '' : o.customSellFee) : E.DEFAULTS.sellFee;
    box.placeholder = custom ? 'Enter %' : '';
    box.title = custom ? '' : 'Choose In person / custom to edit';
    const missing = custom && o.customSellFee == null;
    box.classList.toggle('need', missing);
    hint.textContent = !custom ? 'Set by eBay; choose custom to edit' : missing ? 'Enter your fee (usually 10–20%)' : 'In person is usually 10–20%';
    hint.classList.toggle('need', missing);
  }
  function bindAssumptions(rerender) {
    syncSellUI();
    const num = (id, key) => document.getElementById(id).addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) { S.opts[key] = v; saveOpts(); rerender(); } });
    num('o-fee', 'gradingFee'); num('o-ship', 'shipping'); num('o-drop', 'valueDrop');
    const sell = document.getElementById('o-sell');
    const setFee = () => { const v = parseFloat(sell.value); S.opts.customSellFee = isNaN(v) ? null : Math.min(Math.max(v, 0), 50); applySellMode(S.opts); syncSellUI(); rerender(); };
    sell.addEventListener('change', setFee);
    sell.addEventListener('keydown', (e) => { if (e.key === 'Enter') setFee(); });
    document.getElementById('o-sellp').addEventListener('change', (e) => {
      S.opts.sellMode = e.target.value;
      if (S.opts.sellMode === 'custom') S.opts.customSellFee = null; // take the 11% away; the user must enter their own
      applySellMode(S.opts); syncSellUI(); rerender();
      if (S.opts.sellMode === 'custom') { const b = document.getElementById('o-sell'); if (b) b.focus(); }
    });
    document.getElementById('o-reset').addEventListener('click', () => { S.opts = applySellMode(Object.assign({}, E.DEFAULTS)); saveOpts(); syncSellUI(); rerender(); });
  }

  // ---------- home ----------
  function renderHome() {
    const cards = S.data.cards;
    const sets = [...new Set(cards.map((c) => c.set))];
    const variants = [...new Set(cards.map((c) => c.variant))];
    const f = S.filt;
    $app.innerHTML = `
      <h1>Which Riftbound cards are worth grading?</h1>
      <p class="lede">Expected profit from buying a raw card and grading it at PSA, after the grading fee, shipping, selling fees and a value drop over PSA's turnaround. Covers overnumbered, signature, SP and ultimate cards from Origins, Spiritforged, Unleashed and Vendetta.</p>
      <div class="panel search"><label for="q" class="note" style="display:block;margin-bottom:6px;font-weight:600">Look up a card</label>
        <input id="q" type="search" placeholder="Card name or number, e.g. “Ahri” or “227”" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="sugg">
        <ul class="suggest" id="sugg" role="listbox" hidden></ul></div>
      ${assumptionsHTML()}
      <div class="panel"><h2 id="tt">Top 50 by expected value</h2>
        <div class="controls">
          <select id="f-set" aria-label="Set"><option value="">All sets</option>${sets.map((s) => `<option ${f.set === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <select id="f-var" aria-label="Variant"><option value="">All variants</option>${variants.map((s) => `<option ${f.variant === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <select id="f-sort" aria-label="Pick the top 50 by"><option value="ev" ${f.sort === 'ev' ? 'selected' : ''}>Top 50 by EV ($)</option><option value="roi" ${f.sort === 'roi' ? 'selected' : ''}>Top 50 by ROI (%)</option></select>
          <label class="chk"><input type="checkbox" id="f-thin" ${f.hideThin ? 'checked' : ''}> Hide “Evidence: Thin”</label>
        </div>
        <div class="tbl-wrap" id="top"></div>
        <p class="note" id="topnote"></p>
      </div>`;
    renderTop();
    bindAssumptions(renderTop);
    const upd = (k) => (e) => { S.filt[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; renderTop(); };
    document.getElementById('f-set').addEventListener('change', upd('set'));
    document.getElementById('f-var').addEventListener('change', upd('variant'));
    document.getElementById('f-sort').addEventListener('change', (e) => { S.filt.sort = e.target.value; S.filt.col = 'rank'; S.filt.dir = 1; renderTop(); });
    document.getElementById('f-thin').addEventListener('change', upd('hideThin'));
    bindSearch();
  }

  function renderTop() {
    const f = S.filt;
    let rows = S.data.cards.filter((c) => (!f.set || c.set === f.set) && (!f.variant || c.variant === f.variant)).map((c) => ({ c, r: evalCard(c) }));
    if (S.opts.sellFee == null) {
      document.getElementById('tt').textContent = 'Top 50 by expected value';
      document.getElementById('top').innerHTML = '<p class="need-msg">Enter your selling fee in <b>Your costs &amp; assumptions</b> to see EV.</p>';
      document.getElementById('topnote').textContent = '';
      return;
    }
    const noData = rows.filter((x) => x.r.ev == null).length;
    rows = rows.filter((x) => x.r.ev != null && !(f.hideThin && x.r.thin));
    rows.sort((a, b) => f.sort === 'roi' ? b.r.roi - a.r.roi : b.r.ev - a.r.ev);
    const top = rows.slice(0, 50).map((x, i) => Object.assign(x, { rank: i + 1 }));
    const pos = rows.filter((x) => x.r.ev > 0).length;
    const COLS = [
      ['rank', '#', 'num', (x) => x.rank],
      ['name', 'Card', '', (x) => x.c.name.toLowerCase()],
      ['raw', 'Raw (TCGplayer)', 'num', (x) => x.r.raw],
      ['v10', 'PSA 10 value', 'num', (x) => x.r.v10.value],
      ['p10', 'Chance of 10', 'num', (x) => x.r.p10],
      ['ev', 'EV / card', 'num', (x) => x.r.ev],
      ['roi', 'ROI', 'num', (x) => x.r.roi],
      ['evid', 'Evidence', '', (x) => x.r.v10.n90],
    ];
    const col = COLS.find((c) => c[0] === f.col) || COLS[0];
    top.sort((a, b) => { const va = col[3](a), vb = col[3](b); return (va < vb ? -1 : va > vb ? 1 : a.rank - b.rank) * f.dir; });
    document.getElementById('tt').textContent = `Top ${Math.min(50, rows.length)} by ${f.sort === 'roi' ? 'return on cost' : 'expected value'}`;
    const th = ([k, label, cls]) => { const on = f.col === k; const arrow = on ? (f.dir > 0 ? '▲' : '▼') : '↕';
      return `<th class="${cls}" aria-sort="${on ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="sort${on ? ' on' : ''}" data-col="${k}">${label}<span class="arr" aria-hidden="true">${arrow}</span></button></th>`; };
    document.getElementById('top').innerHTML = `<table class="cards"><colgroup><col style="width:44px"><col><col style="width:128px"><col style="width:112px"><col style="width:108px"><col style="width:104px"><col style="width:76px"><col style="width:150px"></colgroup>
      <thead><tr>${COLS.map(th).join('')}</tr></thead><tbody>
      ${top.map(({ c, r, rank }) => `<tr class="row" data-id="${c.id}" tabindex="0">
        <td class="num">${rank}</td>
        <td><div class="cname">${esc(c.name)}</div><div class="csub">${esc(c.set)} · ${esc(c.variant)} · #${esc(c.number)}</div></td>
        <td class="num">${usd(r.raw, 2)}</td><td class="num">${usd(r.v10.value)}</td><td class="num">${pct(r.p10)}</td>
        <td class="num ${evCls(r.ev)}">${signUsd(r.ev)}</td><td class="num ${evCls(r.ev)}">${pct(r.roi)}</td><td>${evidenceBadge(c, r)}</td></tr>`).join('')}
      </tbody></table>`;
    document.querySelectorAll('button.sort').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.col;
      if (f.col === k) f.dir = -f.dir; else { f.col = k; f.dir = (k === 'rank' || k === 'name') ? 1 : -1; }
      renderTop();
    }));
    document.getElementById('topnote').textContent = `${pos} of ${rows.length} cards shown have positive EV at your settings.` + (noData ? ` ${noData} card${noData > 1 ? 's have' : ' has'} no PSA 10 sales in 90 days and can't be ranked; search for them to see their sources.` : '');
    document.querySelectorAll('tr.row').forEach((tr) => {
      const go = (e) => { if (e.target.closest('a')) return; location.hash = '#card-' + tr.dataset.id; };
      tr.addEventListener('click', go); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e); });
    });
  }

  function bindSearch() {
    const q = document.getElementById('q'), ul = document.getElementById('sugg');
    let items = [], sel = 0;
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9* ]/g, '');
    const show = () => {
      const t = norm(q.value).trim();
      if (!t) { ul.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
      const words = t.split(/\s+/);
      items = S.data.cards.filter((c) => { const h = norm(`${c.name} ${c.set} ${c.variant} ${c.number} ${c.id}`); return words.every((w) => h.includes(w)); }).slice(0, 12);
      sel = 0;
      ul.innerHTML = items.length ? items.map((c, i) => `<li role="option" data-id="${c.id}" aria-selected="${i === sel}"><span>${esc(c.name)} <span class="meta">· ${esc(c.variant)}</span></span><span class="meta">${esc(c.set)} #${esc(c.number)}</span></li>`).join('') : '<li class="meta">No matching card</li>';
      ul.hidden = false; q.setAttribute('aria-expanded', 'true');
      ul.querySelectorAll('li[data-id]').forEach((li) => li.addEventListener('mousedown', () => { location.hash = '#card-' + li.dataset.id; }));
    };
    q.addEventListener('input', show);
    q.addEventListener('keydown', (e) => {
      if (ul.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; ul.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', i === sel)); }
      if (e.key === 'Enter') location.hash = '#card-' + items[sel].id;
      if (e.key === 'Escape') { ul.hidden = true; }
    });
    q.addEventListener('blur', () => setTimeout(() => { ul.hidden = true; }, 150));
  }

  // Card art is loaded straight from TCGplayer's image server (not copied into this repo).
  function cardImage(c) {
    const pid = c.links.tcgplayer && (c.links.tcgplayer.match(/product\/(\d+)/) || [])[1];
    if (!pid) return '<div class="card-img none">No image</div>';
    const src = `https://tcgplayer-cdn.tcgplayer.com/product/${pid}_in_1000x1000.jpg`;
    return `<a class="card-img" href="${esc(c.links.tcgplayer)}" target="_blank" rel="noopener" title="View on TCGplayer"><img src="${src}" alt="${esc(c.name)} (${esc(c.variant)}) card" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('none');this.parentNode.textContent='No image'"></a>`;
  }

  // ---------- card page ----------
  let soldRange = 30;
  function renderCard(c) {
    const r = evalCard(c);
    const hist = S.hist[c.id] || [];
    const cut30 = E.daysBefore(S.data.updated, 30);
    const thinBox = r.v10.n90 === 0
      ? `<div class="thin-box"><b>No PSA 10 sales found</b> in the last 90 days, so EV can't be calculated. <a href="${esc(c.links.ebaySold)}" target="_blank" rel="noopener">Check eBay sold listings yourself →</a></div>`
      : r.thin ? `<div class="thin-box"><b>Evidence: Thin.</b> Only ${r.v10.n90} PSA 10 sale${r.v10.n90 > 1 ? 's' : ''} in 90 days, so the PSA 10 value may not hold. <a href="${esc(c.links.ebaySold)}" target="_blank" rel="noopener">Review the sold listings on eBay →</a></div>` : '';
    $app.innerHTML = `
      <a href="#" class="back">← All cards</a>
      <div class="card-head">
        <div class="head-left">${cardImage(c)}<div><h1>${esc(c.name)}</h1>
          <div class="tags"><span class="tag">${esc(c.set)}</span><span class="tag">${esc(c.variant)}</span><span class="tag">#${esc(c.number)}</span>${evidenceBadge(c, r)}</div></div></div>
        <div class="hero"><div class="big ${evCls(r.ev)}">${signUsd(r.ev)}</div><div class="lbl">Expected profit per card graded${r.roi != null ? ` · ROI ${pct(r.roi)}` : ''}</div></div>
      </div>
      ${thinBox}
      <div class="tiles">
        <div class="tile"><div class="k">Raw price (TCGplayer market)</div><div class="v">${usd(r.raw, 2)}</div><div class="s">Lowest listing ${usd(c.raw.low, 2)}</div></div>
        <div class="tile"><div class="k">PSA 10 value</div><div class="v">${usd(r.v10.value)}</div><div class="s">${r.v10.basis}${r.v10.n ? `, ${plural(r.v10.n, 'sale')}` : ''}</div></div>
        <div class="tile"><div class="k">PSA 9 value</div><div class="v">${usd(r.v9.value)}</div><div class="s">${r.v9.basis}${r.v9.n ? `, ${plural(r.v9.n, 'sale')}` : ''}</div></div>
        <div class="tile"><div class="k">PSA population</div><div class="v">${c.pop.total.toLocaleString()}</div><div class="s">${c.pop.psa10.toLocaleString()} × 10 · ${c.pop.psa9.toLocaleString()} × 9</div></div>
      </div>
      <div class="grid2">
        <div class="panel"><h2>How the EV adds up</h2>${breakdownHTML(r)}</div>
        ${assumptionsHTML()}
      </div>
      <div class="grid2">
        <div class="panel"><h2>Sold price, last 90 days</h2><div id="ch-price"></div></div>
        <div class="panel"><h2>PSA population over time</h2><div id="ch-pop"></div></div>
      </div>
      <div class="panel"><div class="controls" style="justify-content:space-between"><h2 style="margin:0">eBay sold PSA 9 &amp; 10 listings</h2>
        <div class="seg" role="group" aria-label="Range"><button data-r="30" aria-pressed="${soldRange === 30}">Last 30 days</button><button data-r="90" aria-pressed="${soldRange === 90}">All 90 days</button></div></div>
        <div id="soldlist"></div></div>
      <div class="panel sources"><h2>Sources</h2><ul>
        <li><a href="${esc(c.links.psa)}" target="_blank" rel="noopener">PSA Population Report — ${esc(c.set)}</a> (row #${esc(c.number.split('/')[0])})</li>
        ${c.links.tcgplayer ? `<li><a href="${esc(c.links.tcgplayer)}" target="_blank" rel="noopener">TCGplayer — ${esc(c.name)} (${esc(c.variant)})</a></li>` : '<li>TCGplayer — no listing found</li>'}
        <li><a href="${esc(c.links.ebaySold)}" target="_blank" rel="noopener">eBay sold listings search</a> — every sale used above is linked in the list${c.excluded ? `; ${c.excluded} sale${c.excluded > 1 ? 's' : ''} more than 2.5× away from the median were dropped as likely mismatches` : ''}</li>
        <li class="note">Collected ${fmtDate(S.data.updated)}. Sales older than 30 days are listed by date and price only.</li>
      </ul></div>`;
    bindAssumptions(() => renderCard(c));
    priceChart(document.getElementById('ch-price'), c, hist);
    popChart(document.getElementById('ch-pop'), hist);
    const drawSold = () => {
      const list = c.sales.filter((s) => soldRange === 90 || s.d >= cut30);
      document.getElementById('soldlist').innerHTML = list.length ? `<div class="tbl-wrap"><table class="sold"><thead><tr><th>Date</th><th>Grade</th><th class="num" style="text-align:right">Price</th><th>Listing</th></tr></thead><tbody>
        ${list.map((s) => `<tr><td>${fmtDate(s.d)}</td><td>PSA ${s.g}</td><td class="num">${usd(s.p)}${s.bo ? ' <span class="note" title="Best offer accepted; final price may be lower">(best offer)</span>' : ''}</td>
          <td>${s.id ? `<a href="https://www.ebay.com/itm/${s.id}" target="_blank" rel="noopener">View on eBay</a>` : '<span class="note">older than 30 days</span>'}</td></tr>`).join('')}</tbody></table></div>`
        : `<p class="note">No PSA 9 or 10 sales in this range. <a href="${esc(c.links.ebaySold)}" target="_blank" rel="noopener">Search eBay sold listings</a>.</p>`;
      document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.r === soldRange));
    };
    document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { soldRange = +b.dataset.r; drawSold(); }));
    drawSold();
  }

  function breakdownHTML(r) {
    if (r.needFee) return '<p class="need-msg">Enter your selling fee in <b>Your costs &amp; assumptions</b> to see EV.</p>';
    if (!r.outcomes) return `<p class="note">Not enough data to calculate. ${r.raw == null ? 'No TCGplayer raw price.' : 'No PSA 10 sales in 90 days.'}</p>`;
    const o = S.opts;
    return `<table class="brk"><thead><tr><th>Outcome</th><th class="num">Chance</th><th class="num">Sells for</th><th class="num">You keep*</th></tr></thead><tbody>
      ${r.outcomes.map((x) => `<tr><td>${x.label}${x.note ? ` <span class="note">(${x.note})</span>` : ''}</td><td class="num">${pct(x.prob, 1)}</td><td class="num">${usd(x.sale)}</td><td class="num">${usd(x.net)}</td></tr>`).join('')}
      <tr class="total"><td>Expected sale proceeds</td><td></td><td></td><td class="num">${usd(r.expected)}</td></tr>
      <tr><td>Buy raw card</td><td></td><td></td><td class="num">−${usd(r.raw)}</td></tr>
      <tr><td>PSA fee + shipping</td><td></td><td></td><td class="num">−${usd(o.gradingFee + o.shipping, 2)}</td></tr>
      <tr class="total"><td>Expected profit</td><td></td><td></td><td class="num ${evCls(r.ev)}">${signUsd(r.ev)}</td></tr></tbody></table>
      <p class="note">*After a ${o.valueDrop}% value drop over PSA's turnaround and a ${o.sellFee}% selling fee. Grade chances come from this card's PSA population, blended with the set average when few copies have been graded.</p>`;
  }

  // ---------- charts (plain SVG, hover tooltips) ----------
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const tday = (iso) => Date.parse(iso + 'T00:00:00Z') / 864e5;
  const money = (v) => v >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : '$' + Math.round(v);

  function frame(host, { yMax, x0, x1, fmtY }) {
    const W = 520, H = 240, m = { l: 46, r: 12, t: 10, b: 26 };
    const wrap = document.createElement('div'); wrap.className = 'chart'; host.appendChild(wrap);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, wrap);
    const tip = document.createElement('div'); tip.className = 'tip'; wrap.appendChild(tip);
    const X = (d) => m.l + (x1 === x0 ? (W - m.l - m.r) / 2 : (d - x0) / (x1 - x0) * (W - m.l - m.r));
    const Y = (v) => H - m.b - v / yMax * (H - m.t - m.b);
    const g = el('g', { class: 'axis' }, svg);
    for (let i = 0; i <= 5; i++) {
      const v = yMax * i / 5, y = Y(v);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i ? 'gridline' : 'baseline' }, g);
      el('text', { x: m.l - 6, y: y + 4, 'text-anchor': 'end' }, g).textContent = fmtY(v);
    }
    return { svg, tip, wrap, X, Y, W, H, m, g };
  }
  function showTip(f, x, y, html) {
    f.tip.innerHTML = html; f.tip.style.display = 'block';
    const r = f.wrap.getBoundingClientRect(), sx = r.width / f.W;
    let left = x * sx + 12; if (left + f.tip.offsetWidth > r.width) left = x * sx - f.tip.offsetWidth - 12;
    f.tip.style.left = left + 'px'; f.tip.style.top = Math.max(0, y * sx - 20) + 'px';
  }

  function priceChart(host, c, hist) {
    const sales = c.sales;
    const raws = hist.filter((h) => h.raw != null);
    if (!sales.length && !raws.length) { host.innerHTML = '<p class="empty-chart">No sold data yet.</p>'; return; }
    host.innerHTML = `<div class="legend"><span><i class="sw" style="background:var(--series-1)"></i>PSA 10 sale</span><span><i class="sw" style="background:var(--series-2)"></i>PSA 9 sale</span><span><i class="sw line" style="background:var(--series-3)"></i>Raw (TCGplayer, weekly)</span></div>`;
    const end = tday(S.data.updated), start = end - 90;
    const yMax = niceMax(Math.max(...sales.map((s) => s.p), ...raws.map((h) => h.raw), 1) * 1.05);
    const f = frame(host, { yMax, x0: start, x1: end, fmtY: money });
    for (let i = 0; i <= 3; i++) { const d = start + i * 30, iso = new Date(d * 864e5).toISOString().slice(0, 10); el('text', { x: f.X(d), y: f.H - 8, 'text-anchor': i === 0 ? 'start' : i === 3 ? 'end' : 'middle' }, f.g).textContent = shortDate(iso); }
    // 14-day rolling median for PSA 10, so the trend reads through the dots
    const s10 = sales.filter((s) => s.g === 10).map((s) => ({ t: tday(s.d), p: s.p })).sort((a, b) => a.t - b.t);
    if (s10.length >= 4) {
      const pts = [];
      for (let t = start + 7; t <= end; t += 3) { const w = s10.filter((s) => Math.abs(s.t - t) <= 7).map((s) => s.p); if (w.length >= 2) pts.push([f.X(t), f.Y(E.median(w))]); }
      if (pts.length > 1) el('path', { d: 'M' + pts.map((p) => p.join(',')).join('L'), fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2, 'stroke-linejoin': 'round', opacity: 0.55 }, f.svg);
    }
    if (raws.length) {
      const pts = raws.map((h) => [f.X(tday(h.d)), f.Y(h.raw)]);
      if (pts.length > 1) el('path', { d: 'M' + pts.map((p) => p.join(',')).join('L'), fill: 'none', stroke: 'var(--series-3)', 'stroke-width': 2 }, f.svg);
      pts.forEach((p) => el('rect', { x: p[0] - 4, y: p[1] - 4, width: 8, height: 8, rx: 2, fill: 'var(--series-3)', stroke: 'var(--surface-1)', 'stroke-width': 2 }, f.svg));
    }
    const marks = [];
    sales.forEach((s) => { const x = f.X(tday(s.d)), y = f.Y(s.p); el('circle', { cx: x, cy: y, r: 4, fill: s.g === 10 ? 'var(--series-1)' : 'var(--series-2)', stroke: 'var(--surface-1)', 'stroke-width': 1.5, opacity: 0.9 }, f.svg); marks.push({ x, y, html: `<b>PSA ${s.g}</b> · ${usd(s.p)}<br>${fmtDate(s.d)}` }); });
    raws.forEach((h) => marks.push({ x: f.X(tday(h.d)), y: f.Y(h.raw), html: `<b>Raw (TCGplayer)</b> · ${usd(h.raw, 2)}<br>${fmtDate(h.d)}` }));
    const hit = el('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, f.svg);
    const ring = el('circle', { r: 7, fill: 'none', stroke: 'var(--text-primary)', 'stroke-width': 1.5, display: 'none' }, f.svg);
    hit.addEventListener('mousemove', (e) => {
      const pt = f.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(f.svg.getScreenCTM().inverse());
      let best = null, bd = 1e9; marks.forEach((mk) => { const d = Math.hypot(mk.x - p.x, mk.y - p.y); if (d < bd) { bd = d; best = mk; } });
      if (best && bd < 30) { ring.setAttribute('cx', best.x); ring.setAttribute('cy', best.y); ring.setAttribute('display', ''); showTip(f, best.x, best.y, best.html); } else { ring.setAttribute('display', 'none'); f.tip.style.display = 'none'; }
    });
    hit.addEventListener('mouseleave', () => { ring.setAttribute('display', 'none'); f.tip.style.display = 'none'; });
    if (raws.length < 2) host.insertAdjacentHTML('beforeend', `<p class="note">Raw price is tracked weekly starting ${fmtDate(raws[0] ? raws[0].d : S.data.updated)}; the line fills in each Thursday.</p>`);
  }

  function popChart(host, hist) {
    if (!hist.length) { host.innerHTML = '<p class="empty-chart">No population history yet.</p>'; return; }
    const series = [['total', 'Total graded', 'var(--series-3)'], ['psa10', 'PSA 10', 'var(--series-1)'], ['psa9', 'PSA 9', 'var(--series-2)']];
    host.innerHTML = `<div class="legend">${series.map((s) => `<span><i class="sw line" style="background:${s[2]}"></i>${s[1]}</span>`).join('')}</div>`;
    const x0 = tday(hist[0].d), x1 = Math.max(tday(hist[hist.length - 1].d), x0 + 28);
    const yMax = niceMax(Math.max(...hist.map((h) => h.total), 1) * 1.05);
    const f = frame(host, { yMax, x0, x1, fmtY: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v) });
    el('text', { x: f.X(x0), y: f.H - 8, 'text-anchor': 'start' }, f.g).textContent = shortDate(hist[0].d);
    el('text', { x: f.X(x1), y: f.H - 8, 'text-anchor': 'end' }, f.g).textContent = shortDate(new Date(x1 * 864e5).toISOString().slice(0, 10));
    series.forEach(([k, , col]) => {
      const pts = hist.map((h) => [f.X(tday(h.d)), f.Y(h[k])]);
      if (pts.length > 1) el('path', { d: 'M' + pts.map((p) => p.join(',')).join('L'), fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round' }, f.svg);
      pts.forEach((p) => el('circle', { cx: p[0], cy: p[1], r: 4.5, fill: col, stroke: 'var(--surface-1)', 'stroke-width': 2 }, f.svg));
    });
    // direct labels on the last point
    const last = hist[hist.length - 1];
    const labs = series.map(([k, lbl]) => ({ y: f.Y(last[k]) + 4, t: `${lbl}: ${last[k].toLocaleString()}` })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 13) labs[i].y = labs[i - 1].y + 13;
    labs.forEach((l) => { el('text', { x: f.X(tday(last.d)) + 9, y: l.y, fill: 'var(--text-secondary)', 'font-size': 11 }, f.svg).textContent = l.t; });
    const cross = el('line', { y1: f.m.t, y2: f.H - f.m.b, stroke: 'var(--text-muted)', 'stroke-width': 1, display: 'none' }, f.svg);
    const hit = el('rect', { x: f.m.l, y: f.m.t, width: f.W - f.m.l - f.m.r, height: f.H - f.m.t - f.m.b, fill: 'transparent' }, f.svg);
    hit.addEventListener('mousemove', (e) => {
      const pt = f.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(f.svg.getScreenCTM().inverse());
      let best = hist[0]; hist.forEach((h) => { if (Math.abs(f.X(tday(h.d)) - p.x) < Math.abs(f.X(tday(best.d)) - p.x)) best = h; });
      const x = f.X(tday(best.d)); cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('display', '');
      showTip(f, x, f.Y(best.total), `<b>${fmtDate(best.d)}</b><br>Total ${best.total.toLocaleString()}<br>PSA 10 ${best.psa10.toLocaleString()} (${pct(best.total ? best.psa10 / best.total : 0)})<br>PSA 9 ${best.psa9.toLocaleString()}`);
    });
    hit.addEventListener('mouseleave', () => { cross.setAttribute('display', 'none'); f.tip.style.display = 'none'; });
    host.insertAdjacentHTML('beforeend', `${hist.length < 3 ? `<p class="note">Tracking started ${fmtDate(hist[0].d)}. PSA only publishes current counts, so a new point is added each Thursday.</p>` : ''}
      <details class="tv"><summary>Show as table</summary><table><thead><tr><th>Week of</th><th>Total</th><th>PSA 10</th><th>PSA 9</th><th>Gem rate</th></tr></thead><tbody>
      ${hist.slice().reverse().map((h) => `<tr><td>${fmtDate(h.d)}</td><td>${h.total.toLocaleString()}</td><td>${h.psa10.toLocaleString()}</td><td>${h.psa9.toLocaleString()}</td><td>${pct(h.total ? h.psa10 / h.total : 0)}</td></tr>`).join('')}</tbody></table></details>`);
  }

  load().catch((e) => { $app.innerHTML = `<p class="loading">Couldn't load card data (${esc(e.message)}).</p>`; });
})();
