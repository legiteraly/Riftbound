// EV model for grading a raw Riftbound card at PSA. Shared by the site and the tests.
// All money in USD. See README.md "How EV is calculated".
(function (root) {
  const DEFAULTS = {
    gradingFee: 40,     // PSA fee per card
    shipping: 1,        // shipping to PSA, per card
    sellFee: 11,        // % taken when you sell (eBay ~11%, in person 10-20%)
    sellMode: 'ebay',   // 'ebay' locks sellFee at 11; 'custom' uses customSellFee
    customSellFee: null, // the user's own fee when selling in person / elsewhere (must be entered)
    valueDrop: 25,      // % price drop assumed over the ~80-90 day PSA turnaround
    thinMin: 5,         // fewer PSA 10 sales than this in 90 days = Evidence: Thin
    priorWeight: 10,    // how many "virtual" graded copies the set average counts for
  };

  const median = (a) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const daysBefore = (iso, n) => {
    const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };

  // Recent value: median of last 30 days if there are >= 3 sales, else the 90-day median.
  function gradeValue(sales, grade, updated) {
    const all = sales.filter((s) => s.g === grade);
    const cut = daysBefore(updated, 30);
    const recent = all.filter((s) => s.d >= cut);
    if (recent.length >= 3) return { value: median(recent.map((s) => s.p)), basis: '30-day median', n: recent.length, n90: all.length };
    if (all.length) return { value: median(all.map((s) => s.p)), basis: '90-day median', n: all.length, n90: all.length };
    return { value: null, basis: 'no sales', n: 0, n90: 0 };
  }

  // Set + variant average grade rates, used to steady cards with small populations.
  function priors(cards) {
    const acc = {};
    for (const c of cards) {
      const k = c.setCode + '|' + c.variant;
      const a = (acc[k] = acc[k] || { t: 0, p10: 0, p9: 0 });
      a.t += c.pop.total; a.p10 += c.pop.psa10; a.p9 += c.pop.psa9;
    }
    const out = {};
    for (const k in acc) out[k] = acc[k].t ? { p10: acc[k].p10 / acc[k].t, p9: acc[k].p9 / acc[k].t } : { p10: 0.7, p9: 0.15 };
    return out;
  }

  function evaluate(card, opts, pri, updated) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const pr = pri[card.setCode + '|' + card.variant] || { p10: 0.7, p9: 0.15 };
    const k = o.priorWeight, t = card.pop.total;
    const p10 = (card.pop.psa10 + k * pr.p10) / (t + k);
    const p9 = (card.pop.psa9 + k * pr.p9) / (t + k);
    const pLow = Math.max(0, 1 - p10 - p9);

    const raw = card.raw.market;
    const v10 = gradeValue(card.sales, 10, updated);
    const v9 = gradeValue(card.sales, 9, updated);
    const thin = v10.n90 < o.thinMin;

    const keep = (1 - o.valueDrop / 100) * (1 - o.sellFee / 100);
    const cost = (raw || 0) + o.gradingFee + o.shipping;
    const needFee = o.sellFee == null || isNaN(o.sellFee);
    if (raw == null || v10.value == null || needFee) {
      return { p10, p9, pLow, v10, v9, raw, cost, thin, ev: null, roi: null, outcomes: null, needFee };
    }
    // A 9 (or lower) can be cracked and sold raw, so it is worth at least the raw price.
    const sale9 = Math.max(v9.value || 0, raw);
    const outcomes = [
      { label: 'PSA 10', prob: p10, sale: v10.value, net: v10.value * keep },
      { label: 'PSA 9', prob: p9, sale: sale9, net: sale9 * keep, note: v9.value == null || v9.value < raw ? 'crack & sell raw' : null },
      { label: 'PSA 8 or lower', prob: pLow, sale: raw, net: raw * keep, note: 'crack & sell raw' },
    ];
    const expected = outcomes.reduce((s, x) => s + x.prob * x.net, 0);
    const ev = expected - cost;
    return { p10, p9, pLow, v10, v9, raw, cost, expected, thin, ev, roi: ev / cost, outcomes, keep };
  }

  root.RiftEV = { DEFAULTS, evaluate, priors, gradeValue, median, daysBefore };
  if (typeof module !== 'undefined') module.exports = root.RiftEV;
})(typeof window !== 'undefined' ? window : globalThis);
