'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const math = el => window.renderMathInElement && renderMathInElement(el, {
  delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}],
  throwOnError: false
});
const M = {
  SN1: {n: 'SN1', rate: String.raw`$\text{rate}=k[\text{RX}]$`, stereo: 'Racemisation (planar $\text{C}^+$)', step: 'Two steps, carbocation'},
  SN2: {n: 'SN2', rate: String.raw`$\text{rate}=k[\text{RX}][\text{Nu}^-]$`, stereo: 'Inversion (Walden)', step: 'One concerted step'},
  E1:  {n: 'E1',  rate: String.raw`$\text{rate}=k[\text{RX}]$`, stereo: 'Zaitsev alkene', step: 'Two steps, carbocation'},
  E2:  {n: 'E2',  rate: String.raw`$\text{rate}=k[\text{RX}][\text{B}^-]$`, stereo: 'Anti-periplanar H, Zaitsev (Hofmann if bulky)', step: 'One concerted step'},
  NR:  {n: 'No reaction', rate: '—', stereo: '—', step: '—'}
};

/* ---------- tabs ---------- */
function show(tab) {
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $$('.panel').forEach(p => p.classList.toggle('on', p.id === tab));
}
$$('.tab').forEach(b => b.onclick = () => show(b.dataset.tab));

/* ---------- 1. predictor ---------- */
const OPT = {
  sub:  [['methyl', 'Methyl'], ['primary', '1° (primary)'], ['secondary', '2° (secondary)'], ['tertiary', '3° (tertiary)']],
  reag: [['nu', 'Good Nu, weak base ($\\text{I}^-,\\text{CN}^-,\\text{N}_3^-$)'], ['sb', 'Strong base/Nu ($\\text{HO}^-,\\text{EtO}^-$)'],
         ['bulky', 'Bulky base ($t\\text{-BuOK}$)'], ['weak', 'Weak Nu/base ($\\text{H}_2\\text{O},\\text{ROH}$)']],
  solv: [['protic', 'Polar protic (EtOH, $\\text{H}_2\\text{O}$)'], ['aprotic', 'Polar aprotic (DMSO, DMF, acetone)']],
  temp: [['low', 'Room temp ❄️'], ['high', 'Heat 🔥']]
};
const ids = {sub: 'c-sub', reag: 'c-reag', solv: 'c-solv', temp: 'c-temp'};
Object.keys(OPT).forEach(k => {
  $('#' + ids[k]).innerHTML = OPT[k].map((o, i) =>
    `<label class="chip"><input type="radio" name="${k}" value="${o[0]}" ${i === (k === 'sub' ? 2 : 0) ? 'checked' : ''}><span>${o[1]}</span></label>`).join('');
});
math($('#predict'));
const val = k => $(`input[name=${k}]:checked`).value;

function predict(s, r, sol, heat) {
  const why = []; let major, minor = null;
  if (r === 'weak') {
    if (sol === 'aprotic' || s === 'methyl' || s === 'primary') {
      major = 'NR'; why.push('A weak nucleophile cannot force $S_N2$, and a 1°/methyl cation (or a solvent that cannot ionise RX) rules out $S_N1$/$E1$.');
    } else {
      major = heat ? 'E1' : 'SN1'; minor = heat ? 'SN1' : 'E1';
      why.push(`A ${s} carbocation forms easily in a protic solvent; the solvent then acts as the nucleophile.`);
      why.push(heat ? 'Heat favours elimination ($\\Delta S>0$, so $-T\\Delta S$ lowers $\\Delta G$).' : 'At low temperature substitution beats elimination.');
    }
  } else if (r === 'bulky') {
    if (s === 'methyl') { major = 'SN2'; why.push('Methyl has no $\\beta$-H, so elimination is impossible.'); }
    else { major = 'E2'; why.push('A bulky base cannot reach the carbon, so it removes the more accessible $\\beta$-H instead.'); if (s === 'primary') why.push('Gives the less substituted (Hofmann) alkene.'); }
  } else if (r === 'sb') {
    if (s === 'methyl') { major = 'SN2'; why.push('Unhindered methyl carbon, no $\\beta$-H.'); }
    else if (s === 'primary') { major = heat ? 'E2' : 'SN2'; minor = heat ? 'SN2' : 'E2'; why.push('Primary carbon is open to backside attack; heat pushes toward $E2$.'); }
    else { major = 'E2'; minor = s === 'secondary' ? 'SN2' : null; why.push('A strong base with a branched substrate favours $E2$ (3° cannot do $S_N2$).'); }
  } else { // good Nu, weak base
    if (s === 'methyl' || s === 'primary') { major = 'SN2'; why.push('Strong nucleophile + unhindered carbon: classic $S_N2$.'); }
    else if (s === 'secondary') { major = 'SN2'; minor = 'E2'; why.push(sol === 'aprotic' ? 'A polar aprotic solvent leaves $\\text{Nu}^-$ naked and reactive.' : 'A protic solvent solvates $\\text{Nu}^-$, so it is slower, and $S_N1/E1$ compete.'); }
    else if (sol === 'protic') { major = 'SN1'; minor = 'E1'; why.push('3° blocks backside attack, a weakly basic Nu avoids $E2$, and a protic solvent stabilises $\\text{R}^+$.'); }
    else { major = 'E2'; why.push('3° cannot do $S_N2$ and aprotic solvent does not ionise RX, so slow $E2$ is left.'); }
  }
  return {major, minor, why};
}

$('#go').onclick = () => {
  const p = predict(val('sub'), val('reag'), val('solv'), val('temp') === 'high'), m = M[p.major], box = $('#result');
  box.hidden = false;
  box.innerHTML = `<div>Major: <span class="badge">${m.n}</span>
    ${p.minor ? ` &nbsp;Minor: <span class="badge minor">${M[p.minor].n}</span>` : ''}</div>
    <div class="facts"><div class="fact"><b>Rate law</b>${m.rate}</div><div class="fact"><b>Stereochemistry</b>${m.stereo}</div><div class="fact"><b>Steps</b>${m.step}</div></div>
    <ul>${p.why.map(w => `<li>${w}</li>`).join('')}</ul>
    ${M[p.major].rate !== '—' ? `<button class="btn ghost" id="see">Watch ${m.n} 🏹</button>` : ''}`;
  math(box);
  const see = $('#see'); if (see) see.onclick = () => { show('visual'); pickMech(p.major); };
};

/* ---------- 2. visualizer ---------- */
const T = (x, y, t, c = '') => `<text x="${x}" y="${y}" class="nd ${c}" text-anchor="middle">${t}</text>`;
const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="bd"/>`;
const A = (d, lab, lx, ly) => `<path d="${d}" class="arrow" marker-end="url(#ah)"/><text x="${lx}" y="${ly}" class="al" text-anchor="middle">${lab}</text>`;
const cation = T(300, 130, 'R₃C⁺', 'c') + T(300, 175, 'planar, sp²', 'sub');
const V = {
  SN2: [
    {t: 'Backside attack + leaving, all at once', d: String.raw`The nucleophile's lone pair attacks at $180^\circ$ to the $\text{C–Br}$ bond while $\text{Br}$ leaves. Rate $=k[\text{RX}][\text{Nu}^-]$.`,
     s: T(70, 130, 'Nu⁻', 'nu') + T(300, 130, 'C', 'c') + T(300, 175, 'R₃', 'sub') + L(318, 126, 385, 126) + T(410, 130, 'Br', 'lg') +
        A('M90 108 Q190 36 290 106', 'lone pair attacks C', 190, 52) + A('M352 118 Q395 66 408 104', 'C–Br pair leaves', 450, 66)},
    {t: 'Transition state', d: String.raw`Pentacoordinate carbon, partial bonds on both sides: $[\text{Nu}\cdots\text{C}\cdots\text{Br}]^{\ddagger}$. The substituents flatten like an umbrella.`,
     s: T(320, 120, '[ Nu···C···Br ]‡', 'ts') + T(320, 170, 'δ⁻ at both ends, R₃ in one plane', 'sub')},
    {t: 'Inverted product', d: String.raw`$\text{Nu–C}$ is formed, $\text{Br}^-$ is released, and the stereocentre is **inverted** (Walden inversion).`,
     s: T(200, 130, 'Nu–CR₃', 'prod') + T(430, 130, 'Br⁻', 'lg') + T(200, 175, 'configuration inverted', 'sub')}
  ],
  SN1: [
    {t: 'Ionisation (slow, rate-determining)', d: String.raw`The $\text{C–Br}$ bond breaks heterolytically, giving a carbocation and $\text{Br}^-$. Rate $=k[\text{RX}]$.`,
     s: T(300, 130, 'R₃C', 'c') + L(335, 126, 395, 126) + T(420, 130, 'Br', 'lg') + A('M365 116 Q400 66 418 104', 'C–Br pair leaves', 450, 66)},
    {t: 'Carbocation intermediate', d: String.raw`A planar $sp^2$ carbocation $\text{R}_3\text{C}^+$ with an empty $p$ orbital, stabilised by hyperconjugation: $3^\circ>2^\circ>1^\circ$.`,
     s: cation + T(430, 130, 'Br⁻', 'lg')},
    {t: 'Nucleophile captures C⁺', d: String.raw`The solvent (e.g. $\text{H}_2\text{O}$) attacks either face, so stereochemistry is **racemised**. Loss of $\text{H}^+$ then gives $\text{R–OH}$.`,
     s: T(80, 130, 'H₂Ö:', 'nu') + T(300, 130, 'R₃C⁺', 'c') + A('M110 108 Q200 40 288 104', 'attacks either face', 200, 54) + T(300, 175, 'then −H⁺ → R₃C–OH', 'sub')}
  ],
  E2: [
    {t: 'Concerted elimination', d: String.raw`The base removes a $\beta$-H, the $\text{C–H}$ pair becomes the $\pi$ bond, and $\text{Br}$ leaves, all in one step. Rate $=k[\text{RX}][\text{B}^-]$.`,
     s: T(60, 135, 'B⁻', 'nu') + T(170, 135, 'H', 'sub') + L(188, 130, 240, 130) + T(262, 135, 'Cβ', 'c') + L(285, 130, 340, 130) + T(362, 135, 'Cα', 'c') + L(385, 130, 435, 130) + T(458, 135, 'Br', 'lg') +
        A('M75 112 Q120 66 166 114', 'B takes H', 120, 62) + A('M215 120 Q262 62 312 120', 'C–H → π', 265, 54) + A('M410 120 Q445 70 458 110', 'Br leaves', 490, 78)},
    {t: 'Alkene formed', d: String.raw`Requires an **anti-periplanar** $\text{H–C–C–Br}$ arrangement. Products: alkene $+\ \text{B–H}+\text{Br}^-$ (Zaitsev, unless the base is bulky).`,
     s: T(180, 130, 'C=C', 'prod') + T(320, 130, 'B–H', 'nu') + T(450, 130, 'Br⁻', 'lg') + T(180, 175, 'alkene', 'sub')}
  ],
  E1: [
    {t: 'Ionisation (same as SN1)', d: String.raw`$\text{RX}\rightarrow\text{R}^++\text{X}^-$ is the slow step. Rate $=k[\text{RX}]$.`,
     s: T(300, 130, 'R₃C', 'c') + L(335, 126, 395, 126) + T(420, 130, 'Br', 'lg') + A('M365 116 Q400 66 418 104', 'C–Br pair leaves', 450, 66)},
    {t: 'Base removes β-H', d: String.raw`A weak base (often the solvent) pulls a $\beta$-H next to $\text{C}^+$; the $\text{C–H}$ pair forms the $\pi$ bond.`,
     s: T(70, 135, 'B:', 'nu') + T(180, 135, 'H', 'sub') + L(198, 130, 250, 130) + T(272, 135, 'Cβ', 'c') + L(295, 130, 345, 130) + T(375, 135, 'C⁺', 'c') +
        A('M80 112 Q125 66 176 114', 'B takes H', 125, 62) + A('M225 120 Q272 62 322 120', 'C–H → π', 272, 54)},
    {t: 'Alkene product', d: String.raw`Forms the more substituted alkene (Zaitsev). Heat favours E1 over $S_N1$.`,
     s: T(300, 130, 'C=C', 'prod') + T(300, 175, 'Zaitsev alkene', 'sub')}
  ]
};
let cur = 'SN2', idx = 0;
const defs = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f06fa2"/></marker></defs>';
function pickMech(k) { cur = k; idx = 0; drawV(); }
function drawV() {
  const st = V[cur][idx];
  $('#mech-pills').innerHTML = Object.keys(V).map(k => `<button class="pill ${k === cur ? 'on' : ''}" data-m="${k}">${M[k].n}</button>`).join('');
  $$('.pill').forEach(b => b.onclick = () => pickMech(b.dataset.m));
  $('#svg').innerHTML = defs + st.s;
  $('#st-title').textContent = `Step ${idx + 1}/${V[cur].length}: ${st.t}`;
  $('#st-desc').innerHTML = st.d.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  $('#dots').innerHTML = V[cur].map((_, i) => `<span class="dot ${i === idx ? 'on' : ''}"></span>`).join('');
  $('#prev').disabled = idx === 0; $('#next').disabled = idx === V[cur].length - 1;
  math($('#st-desc'));
}
$('#prev').onclick = () => { idx--; drawV(); };
$('#next').onclick = () => { idx++; drawV(); };
drawV();

/* ---------- 3. quiz ---------- */
const Q = [
  {r: String.raw`$\ce{CH3Br}$ + $\ce{NaCN}$ in DMSO`, a: 'SN2', p: String.raw`$\ce{CH3Br + CN^- -> CH3CN + Br^-}$`, w: 'Methyl halide, strong Nu, aprotic solvent.'},
  {r: String.raw`$\ce{(CH3)3C-Br}$ in $\ce{H2O}$/acetone, 25 °C`, a: 'SN1', p: String.raw`$\ce{(CH3)3C-OH}$`, w: 'Tertiary, weak Nu, protic solvent: stable $\text{R}^+$ forms.'},
  {r: String.raw`$\ce{(CH3)3C-Br}$ + $\ce{NaOEt}$ in EtOH`, a: 'E2', p: String.raw`$\ce{(CH3)2C=CH2}$`, w: 'Strong base and 3° substrate: $S_N2$ is blocked, so $E2$.'},
  {r: String.raw`$\ce{CH3CH2CH2Br}$ + $t$-BuOK in $t$-BuOH`, a: 'E2', p: String.raw`$\ce{CH3CH=CH2}$`, w: 'Bulky base cannot attack carbon; removes $\beta$-H.'},
  {r: String.raw`2-bromopropane + $\ce{NaN3}$ in DMF`, a: 'SN2', p: String.raw`$\ce{(CH3)2CH-N3}$`, w: '$\text{N}_3^-$ is a great Nu but a weak base; aprotic solvent boosts it.'},
  {r: String.raw`$\ce{(CH3)3C-Cl}$ in EtOH, 80 °C`, a: 'E1', p: String.raw`$\ce{(CH3)2C=CH2}$ (major)`, w: 'Weak base, 3°, heat: elimination via the carbocation beats $S_N1$.'},
  {r: String.raw`$\ce{CH3CH2Br}$ + $\ce{NaOH}$ in EtOH, 25 °C`, a: 'SN2', p: String.raw`$\ce{CH3CH2OH}$`, w: 'Primary carbon is open to backside attack at low temperature.'},
  {r: String.raw`2-bromobutane + $\ce{NaOEt}$ in EtOH, heat`, a: 'E2', p: 'but-2-ene (Zaitsev)', w: 'Strong base + 2° + heat: $E2$, giving the more substituted alkene.'},
  {r: String.raw`2-bromo-2-methylbutane in MeOH, 25 °C`, a: 'SN1', p: '2-methoxy-2-methylbutane', w: 'Solvent is the nucleophile ("solvolysis") on a 3° substrate.'},
  {r: String.raw`1-bromobutane + $\ce{NaI}$ in acetone`, a: 'SN2', p: String.raw`$\ce{CH3(CH2)3I}$`, w: 'Finkelstein reaction: $\text{I}^-$ in acetone, a textbook $S_N2$.'}
];
let qs, qi, score, streak;
const shuffle = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
function startQuiz() { qs = shuffle(Q); qi = 0; score = 0; streak = 0; drawQ(); }
function drawQ() {
  const box = $('#quiz-box');
  if (qi >= qs.length) {
    const f = score / qs.length, face = f > .85 ? '🏆' : f > .6 ? '🎉' : '🌱';
    box.innerHTML = `<div class="final"><div class="big">${face}</div><h3>${score} / ${qs.length}</h3>
      <p>${f > .85 ? 'Mechanism master!' : f > .6 ? 'Nice work, review the misses.' : 'Keep going, use the Visualizer tab.'}</p>
      <button class="btn" id="again">Play again 🔁</button></div>`;
    $('#again').onclick = startQuiz; return;
  }
  const q = qs[qi];
  box.innerHTML = `<div class="qmeta"><span>Question ${qi + 1}/${qs.length}</span><span>⭐ ${score} · 🔥 ${streak}</span></div>
    <div class="qbar"><i style="width:${qi / qs.length * 100}%"></i></div>
    <div class="qcard">Which pathway is major?<br><br>${q.r}</div>
    <div class="opts">${['SN1', 'SN2', 'E1', 'E2'].map(k => `<button class="opt" data-k="${k}">${M[k].n}</button>`).join('')}</div>
    <div id="fb"></div>`;
  math(box);
  $$('.opt').forEach(b => b.onclick = () => answer(b, q));
}
function answer(b, q) {
  const ok = b.dataset.k === q.a;
  ok ? (score++, streak++) : (streak = 0);
  $$('.opt').forEach(o => { o.disabled = true; if (o.dataset.k === q.a) o.classList.add('ok'); });
  if (!ok) b.classList.add('bad');
  $('#fb').innerHTML = `<div class="fb"><b>${ok ? '✅ Correct!' : `❌ Answer: ${M[q.a].n}`}</b><br>${q.w}<br>Product: ${q.p}<br><br>
    <button class="btn" id="nx">${qi === qs.length - 1 ? 'See score' : 'Next →'}</button></div>`;
  math($('#fb'));
  $('#nx').onclick = () => { qi++; drawQ(); };
}
startQuiz();
