// ======================================================================
// motion.js · 첫 화면 등장 효과 + 화면 전환 + 시트 열고 닫기
// - 등장 효과: 앱을 열어 표지가 처음 보일 때 딱 한 번 (config.js 의 INTRO_MODE)
//     fold3d: 표지 풍경이 3면 팸플릿처럼 펼쳐져요. 장식 층(.h3-fold)만 움직이고, 진짜 버튼·제목은 처음부터 그대로 눌려요
//     soft:   제목·설명·버튼이 살짝 떠오르며 나타나요
//   화면을 누르거나 키를 누르거나, 다른 화면으로 가거나, 앱이 뒤로 숨거나, '동작 줄이기'를 켜면 바로 끝나요
// - 화면 전환: 홈 아래 메뉴 · 새 여행 단계 · 계획 탭(일정·지도·길안내·교통비)이 바뀔 때만 살짝 밀려 들어와요
//   같은 화면에서 날짜·☆·저장·언어·테마를 바꿀 때는 움직이지 않아요
// - 시트: 새로 열릴 때만 아래에서 올라오고, 닫을 때는 잠깐 내려가며 사라져요
// 세기·속도는 config.js 의 MOTION 에서 바꿔요. render() (ui.js) 가 앞뒤로 motionBefore / motionAfter 를 불러요
// ======================================================================

const MQ_REDUCE = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
function motionReduced() {
  return !!MQ_REDUCE.matches;
}

// 움직임 값은 CSS 변수로 넘겨요 (style.css 의 「첫 화면 등장」 블록이 써요)
(function motionVars() {
  const r = document.documentElement.style,
    a = MOTION.foldAngle;
  r.setProperty('--fold-ms', MOTION.foldMs + 'ms');
  r.setProperty('--fold-st', MOTION.foldStagger + 'ms');
  r.setProperty('--fold-r0', a + 'deg');
  r.setProperty('--fold-r1', -2 * a + 'deg');
  r.setProperty('--fold-r2', 2 * a + 'deg');
  // 접혀 있을 때 가운데 오도록 (펼친 폭 × (1 - cos 각도) / 2)
  r.setProperty('--fold-x', ((1 - Math.cos((a * Math.PI) / 180)) / 2) * 100 + '%');
  r.setProperty('--soft-ms', MOTION.softMs + 'ms');
  r.setProperty('--soft-y', MOTION.softShift + 'px');
  r.setProperty('--pg-ms', MOTION.pageMs + 'ms');
  r.setProperty('--sh-ms', MOTION.sheetMs + 'ms');
})();

// ---------------------------------------------------------------- 첫 화면 등장
const INTRO = { first: true, run: false, mode: '', t0: 0, token: 0, timer: 0, fold: null };
function introRunning() {
  return INTRO.run;
}
// 펼침 장식 층: 표지 그림을 세 조각으로 나눠 복사해요 (그림 안 색 이름(id)이 겹치지 않게 조각마다 뒤에 붙여요)
function introFoldMake() {
  const el = document.createElement('div');
  el.className = 'h3-fold';
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;
  const pane = i =>
    `<div class="h3-fp p${i}"><div class="h3-ff"><div class="h3-fi" style="left:${-i * 100}%">${h3Scene(undefined, undefined, '-f' + i)}<span class="h3-paper"></span><span class="h3-shade"></span></div><span class="h3-fs"></span></div>${i < 2 ? pane(i + 1) : ''}</div>`;
  el.innerHTML = `<div class="h3-fw">${pane(0)}</div>`;
  return el;
}
const INTRO_STOP = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
function introStart() {
  const mode = INTRO_MODE === 'soft' ? (motionReduced() ? 'soft-r' : 'soft') : motionReduced() ? '' : 'fold3d';
  if (!mode) return; // 동작 줄이기: 3D 모드는 완성된 표지를 바로 보여 줘요
  INTRO.run = true;
  INTRO.mode = mode;
  INTRO.t0 = performance.now();
  const tok = ++INTRO.token;
  if (mode === 'fold3d') INTRO.fold = introFoldMake();
  introApply();
  const total = mode === 'fold3d' ? MOTION.foldMs + 2 * MOTION.foldStagger : mode === 'soft' ? MOTION.softMs + 240 : 300;
  INTRO.timer = setTimeout(() => {
    if (tok === INTRO.token) introFinish();
  }, total + 60);
  INTRO_STOP.forEach(t => document.addEventListener(t, introFinish, { capture: true, passive: true }));
}
// 지금 화면에 등장 효과를 붙여요. 등장 중에 화면이 다시 그려져도(저장된 계획을 늦게 불러온 경우 등) 이어서 진행돼요
function introApply() {
  const root = document.querySelector('.shell > .h3.h3-home'),
    bg = root && root.querySelector('.h3-bg');
  if (!root || !root.querySelector('.h3-hero')) return introFinish();
  root.classList.add('intro-' + INTRO.mode);
  root.style.setProperty('--it', -Math.round(performance.now() - INTRO.t0) + 'ms');
  if (INTRO.fold && bg) {
    bg.classList.add('folding');
    bg.appendChild(INTRO.fold);
  }
}
// 바로 끝내기 (여러 번 불러도 괜찮아요). 남은 장식은 모두 치우고, 기다리던 사진이 있으면 이제 보여 줘요
function introFinish() {
  if (!INTRO.run) return;
  INTRO.run = false;
  INTRO.token++;
  clearTimeout(INTRO.timer);
  INTRO_STOP.forEach(t => document.removeEventListener(t, introFinish, { capture: true }));
  if (INTRO.fold) INTRO.fold.remove();
  INTRO.fold = null;
  document.querySelectorAll('.h3.intro-fold3d, .h3.intro-soft, .h3.intro-soft-r').forEach(r => {
    r.classList.remove('intro-fold3d', 'intro-soft', 'intro-soft-r');
    r.style.removeProperty('--it');
  });
  document.querySelectorAll('.h3-bg.folding').forEach(b => b.classList.remove('folding'));
  if (typeof h3ShowReveal === 'function') h3ShowReveal();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) introFinish();
});
window.addEventListener('popstate', introFinish);
window.addEventListener('hashchange', introFinish);
if (MQ_REDUCE.addEventListener) MQ_REDUCE.addEventListener('change', introFinish);

// ---------------------------------------------------------------- 화면 전환
// 화면 이름과 순서(앞으로 가면 오른쪽에서, 뒤로 가면 왼쪽에서 들어와요)
const MV = { key: null, ord: 0, sheet: null, ghost: null };
const MV_HOME = ['home', 'prep', 'areas', 'trips'],
  MV_PLAN = ['sched', 'map', 'guide', 'fare'];
function mvKey() {
  if (S.view === 'home') {
    const t = S.htab || 'home';
    return { k: 'home:' + t, o: Math.max(0, MV_HOME.indexOf(t)) };
  }
  if (S.view === 'dates') return { k: 'dates', o: 10 };
  if (S.view === 'areas') return { k: 'areas', o: 11 };
  const t = S.tab || 'sched';
  return { k: 'plan:' + t, o: 12 + Math.max(0, MV_PLAN.indexOf(t)) / 10 };
}
// position:fixed 가 안에 있으면 옆으로 밀지 않고 흐려졌다 나타나기만 해요 (고정된 버튼이 흔들리지 않게)
function mvHasFixed(el) {
  const all = el.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) if (getComputedStyle(all[i]).position === 'fixed') return true;
  return false;
}
function mvEnter(els, dir) {
  const dx = motionReduced() ? 0 : dir * MOTION.pageShift;
  els.forEach(el => {
    el.style.setProperty('--pg-dx', (dx && !mvHasFixed(el) ? dx : 0) + 'px');
    el.classList.add('pg-in');
    el.addEventListener(
      'animationend',
      e => {
        if (e.target !== el) return;
        el.classList.remove('pg-in');
        el.style.removeProperty('--pg-dx');
      },
      { once: false }
    );
  });
}

// render 바로 전: 닫히는 시트를 잠깐 남겨 두려고 지금 시트를 기억해요
function motionBefore() {
  const sh = document.querySelector('#app .sheet:not(.sh-ghost)'),
    sc = sh && sh.previousElementSibling && sh.previousElementSibling.classList.contains('scrim') ? sh.previousElementSibling : null;
  MV.closing = !S.sheet && sh ? [sc, sh].filter(Boolean) : null;
  MV.closingTop = sh ? sh.scrollTop : 0;
}
// render 바로 뒤
function motionAfter() {
  const cur = mvKey(),
    prev = MV.key;
  MV.key = cur.k;
  const prevOrd = MV.ord;
  MV.ord = cur.o;
  const shType = S.sheet ? S.sheet.type : null,
    opened = shType && shType !== MV.sheet;
  MV.sheet = shType;

  // 첫 화면: 앱을 열자마자 보이는 화면이 표지일 때만 등장 효과 (공유 링크로 열었으면 공유가 먼저라 건너뛰어요)
  if (INTRO.first) {
    INTRO.first = false;
    if (cur.k === 'home:home' && !S.sheet && !S.h3p2 && !/#share=/.test(location.hash)) introStart();
  } else if (INTRO.run) {
    if (cur.k !== prev || S.sheet) introFinish();
    else introApply(); // 같은 표지를 다시 그렸으면 이어서
  }

  // 화면이 바뀌었을 때만 전환
  if (prev && cur.k !== prev) {
    const shell = document.querySelector('#app > .shell');
    if (shell) {
      const els = [...shell.querySelectorAll(':scope > .h3 > .h3-pages, :scope > .h3 > .h3-band, :scope > .h3 > .h3-page, :scope > main.scr')];
      mvEnter(els, cur.o >= prevOrd ? 1 : -1);
    }
  }

  // 시트: 새로 열렸을 때만 올라와요
  if (opened) document.querySelectorAll('#app .scrim, #app .sheet').forEach(e => e.classList.add('sh-in'));
  // 닫힌 시트: 눌리지 않는 그림자로 잠깐 남겨서 내려가며 사라지게
  if (MV.closing) {
    const parts = MV.closing;
    MV.closing = null;
    if (!motionReduced() && parts.every(p => !p.isConnected)) {
      const g = document.createElement('div');
      g.className = 'sh-ghostwrap';
      g.setAttribute('aria-hidden', 'true');
      g.inert = true;
      parts.forEach(p => {
        p.classList.remove('sh-in');
        p.classList.add('sh-ghost');
        p.removeAttribute('role');
        p.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
        if (p.id) p.removeAttribute('id');
        g.appendChild(p);
      });
      document.body.appendChild(g);
      const gs = g.querySelector('.sheet');
      if (gs) gs.scrollTop = MV.closingTop; // 닫기 직전 보던 위치 그대로 내려가요
      setTimeout(() => g.remove(), MOTION.sheetMs + 40);
    }
  }
}
