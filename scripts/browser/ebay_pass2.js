/* Second pass after ebay_classify.js: titles with champion + set + variant word but no subtitle/number.
   Needs window.DEF = <contents of raw/defs.json> set first (prepend "window.DEF=" + defs.json). */
const SW = { ogn: /origins|\bogn\b/, sfd: /spirit ?forged|\bsfd\b/, unl: /unleashed|\bunl\b/, ven: /vendetta|\bven\b/ };
const IGN = new Set(['9','10','2025','2026','298','297','221','219','166','006','6','1','2','3','4','5','7','8']);
const cls2 = function (title) {
  const t = ' ' + title.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9*\/ ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const gm = t.match(/psa ?(10|9)\b/); if (!gm) return null;
  const sig = /signature|signed|\bsig\b|autograph|\bauto\b|\d ?\*|artist sign/.test(t);
  const nums = [...t.matchAll(/(?:^| |#|\/)(sp ?\d|\d{1,4}[ab]?)(?= |\/|\*|$)/g)].map(m => m[1].replace(' ', '')).filter(n => !IGN.has(n));
  const onw = /overnumber|over number|showcase|\bon\b/.test(t); const ns = t.replace(/ /g, ''); const ws = new Set(t.split(/[ \/*]+/));
  const champ = d => d.c.every(w => ws.has(w) || (w.length > 4 && ns.includes(w))); const sub = d => d.w.length > 0 && d.w.every(w => ns.includes(w)); const nm = d => nums.includes(d.n.toLowerCase());
  let c = window.DEF.filter(d => (sub(d) && nm(d)) || (champ(d) && SW[d.s].test(t) && !nums.some(n => n != d.n.toLowerCase()) && (sig ? true : (d.v == 'SP' ? /crystal rose/.test(t) : d.v == 'UR' ? /ultimate/.test(t) : onw))));
  c = c.filter(d => sig ? d.v == 'SIG' : d.v != 'SIG'); if (c.length != 1) return null; return [c[0].k, gm[1]];
};
const st = JSON.parse(localStorage.getItem('eb')); const M = JSON.parse(localStorage.getItem('m')); const got = new Set(M.map(m => m[5])); let add = 0;
for (const [id, v] of Object.entries(st)) { if (got.has(id)) continue; if (/\blot\b|bundle|chinese|japanese|korean|\bcn\b|\bjp\b|french|german|psa ?(10|9) ?x ?\d/i.test(v[3])) continue; const r = cls2(v[3]); if (r) { M.push([r[0], r[1], v[1], v[0], v[2], id]); add++; } }
localStorage.setItem('m', JSON.stringify(M)); add + ' added, total ' + M.length
