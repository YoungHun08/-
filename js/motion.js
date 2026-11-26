// ======================================================================
// motion.js · 첫 화면 등장 효과 + 화면 전환 + 시트 열고 닫기
// - 등장 효과: 앱을 열어 표지가 처음 보일 때 딱 한 번 (config.js 의 INTRO_MODE)
//     fold3d: 표지 풍경이 3면 팸플릿처럼 펼쳐져요. 장식 층(.h3-fold)만 움직이고, 진짜 버튼·제목은 처음부터 그대로 눌려요
//     soft:   제목·설명·버튼이 살짝 떠오르며 나타나요
//   화면을 누르거나 키를 누르거나, 다른 화면으로 가거나, 앱이 뒤로 숨거나, '동작 줄이기'를 켜면 바로 끝나요
// - 화면 전환(아래 「화면 전환」 설명): 큰 화면 이동 · 같은 화면 안 내용 · 일정 카드 펼치기 · 시트 · <details>
//   같은 화면에서 날짜·☆·저장·입력·언어·테마를 바꾸거나 데이터가 늦게 와서 다시 그릴 때는 움직이지 않아요
// 세기·속도는 config.js 의 MOTION 에서 바꿔요. render() (ui.js) 가 앞뒤로 motionBefore / motionAfter 를 불러요
// ======================================================================

// ---------------------------------------------------------------- 설정값 점검 (가장 먼저)
// config.js 가 예전 것이거나 값이 비었거나 잘못돼도(빈 값·NaN·음수·글자) 움직임이 앱을 멈추지 않게 기본값으로 채워요.
// 0 처럼 「일부러 넣은 올바른 값」은 그대로 둬요. 무엇을 고쳤는지는 MV_CFG_ISSUES 에 남겨요 (dev/motion-check.html 에서 보여요)
const MOTION_VERSION = '2026.11.26-2';
const MV_DEFAULTS = {
  foldMs: 950, foldStagger: 80, foldAngle: 72, softMs: 450, softShift: 14, photoWait: 1200,
  pageMs: 300, pageShift: 24, tabMs: 260, tabShift: 18, subMs: 240, subShift: 12,
  sheetMs: 300, sheetRise: 48, sheetInnerMs: 240, sheetInnerShift: 16,
  expandMs: 220, panelMs: 240, noteMs: 220, outPart: 0.6, inDelay: 0, gateMax: 150,
  ease: 'cubic-bezier(.25, .7, .3, 1)', easeOut: 'cubic-bezier(.2, .6, .4, 1)'
};
// 허용 범위 [최소, 최대] (시간 ms · 거리 px · 비율)
const MV_RANGE = {
  foldAngle: [0, 89], outPart: [0.05, 1], inDelay: [0, 1000], gateMax: [16, 1000], photoWait: [0, 10000],
  foldStagger: [0, 1000], softShift: [0, 200], pageShift: [0, 200], tabShift: [0, 200], subShift: [0, 200], sheetRise: [0, 400], sheetInnerShift: [0, 200]
};
const MV_CFG_ISSUES = [];
if (typeof MOTION === 'undefined' || !MOTION || typeof MOTION !== 'object') {
  window.MOTION = {};
  MV_CFG_ISSUES.push('MOTION 없음 → 기본값 사용');
}
(function mvNormalize() {
  const okEase = v => typeof v === 'string' && v.trim() && (!window.CSS || !CSS.supports || CSS.supports('transition-timing-function', v));
  Object.keys(MV_DEFAULTS).forEach(k => {
    const d = MV_DEFAULTS[k],
      v = MOTION[k];
    if (typeof d === 'string') {
      if (!okEase(v)) {
        if (v !== undefined) MV_CFG_ISSUES.push(`${k}: 잘못된 곡선 ${JSON.stringify(v)} → 기본값`);
        else MV_CFG_ISSUES.push(`${k}: 없음 → 기본값`);
        MOTION[k] = d;
      }
      return;
    }
    let n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    if (!Number.isFinite(n)) {
      MV_CFG_ISSUES.push(v === undefined ? `${k}: 없음 → ${d}` : `${k}: 잘못된 값 ${typeof v === 'string' ? JSON.stringify(v) : String(v)} → ${d}`);
      n = d;
    }
    const [lo, hi] = MV_RANGE[k] || [0, 5000]; // 시간 값은 0~5000ms
    if (n < lo) {
      // 음수 시간·거리처럼 아래로 벗어난 값은 실수로 보고 기본값으로 (0 은 「효과 없음」으로 일부러 쓸 수 있어 그대로 둬요)
      MV_CFG_ISSUES.push(`${k}: ${n} 은 ${lo} 보다 작음 → ${d}`);
      n = d;
    } else if (n > hi) {
      MV_CFG_ISSUES.push(`${k}: ${n} 은 너무 큼 → ${hi}`);
      n = hi;
    }
    MOTION[k] = n;
  });
})();
// 함께 배포된 파일인지 확인 (config.js 의 APP_VERSION 과 이 파일의 MOTION_VERSION). 다르면 「섞였을 수 있음」으로만 기록해요
const MV_VERSION_NOTE =
  typeof APP_VERSION === 'undefined' ? 'config.js 에 APP_VERSION 없음 (예전 config.js 일 수 있음)' : APP_VERSION !== MOTION_VERSION ? `버전 다름: config ${APP_VERSION} / motion ${MOTION_VERSION}` : '';
if (MV_VERSION_NOTE) console.warn('[motion] ' + MV_VERSION_NOTE + (MV_CFG_ISSUES.length ? ' · 고친 설정: ' + MV_CFG_ISSUES.join(', ') : ''));
// 예전 config.js 에 없을 수 있는 것들
const MV_INTRO = typeof INTRO_MODE === 'string' && (INTRO_MODE === 'soft' || INTRO_MODE === 'fold3d') ? INTRO_MODE : 'fold3d';
if (typeof scrollMode !== 'function')
  window.scrollMode = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

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

})();

// ---------------------------------------------------------------- 첫 화면 등장
const INTRO = { first: true, run: false, mode: '', t0: 0, token: 0, timer: 0, fold: null };
function introRunning() {
  return INTRO.run;
}
// 펼침 장식 층: 표지 그림을 세 조각으로 나눠 복사해요 (그림 안 색 이름(id)이 겹치지 않게 조각마다 뒤에 붙여요)
function introFoldMake(photo) {
  const el = document.createElement('div');
  el.className = 'h3-fold';
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;
  // 사진이 있으면 사진을, 없으면 그림을 세 조각으로 (그림 안 색 이름(id)이 겹치지 않게 조각마다 뒤에 붙여요)
  const face = i =>
    photo
      ? `<img class="h3-fimg" src="${esc(photo)}" alt=""><span class="h3-pshade"></span>`
      : `${h3Scene(undefined, undefined, '-f' + i)}<span class="h3-paper"></span>`;
  const pane = i =>
    `<div class="h3-fp p${i}"><div class="h3-ff"><div class="h3-fi" style="left:${-i * 100}%">${face(i)}<span class="h3-shade"></span></div><span class="h3-fs"></span></div>${i < 2 ? pane(i + 1) : ''}</div>`;
  el.innerHTML = `<div class="h3-fw">${pane(0)}</div>`;
  return el;
}
const INTRO_STOP = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
// 처음에 그림이 잠깐 보였다가 사진으로 바뀌지 않도록, 첫 사진이 준비될 때까지(최대 MOTION.photoWait) 표지를 비워 두고 기다려요
// 사진이 준비되면 그 사진으로 바로 등장 효과를 시작하고, 사진이 없거나 늦으면 그림으로 시작해요
function introStart() {
  const R = motionReduced(),
    mode = MV_INTRO === 'soft' ? (R ? 'soft-r' : 'soft') : R ? 'none' : 'fold3d';
  INTRO.run = true;
  INTRO.mode = mode;
  INTRO.wait = true;
  INTRO.t0 = performance.now();
  const tok = ++INTRO.token;
  INTRO_STOP.forEach(t => document.addEventListener(t, introFinish, { capture: true, passive: true }));
  introApply();
  if ((typeof H3SHOW !== 'undefined' && H3SHOW && H3SHOW.loaded) || S.photoBroken) introGo();
  else
    INTRO.timer = setTimeout(() => {
      if (tok === INTRO.token) introGo();
    }, MOTION.photoWait);
}
// 사진 준비됨(또는 모두 실패) → home3.js 가 불러요
function introPhoto() {
  if (INTRO.run && INTRO.wait) introGo();
}
function introGo() {
  if (!INTRO.run || !INTRO.wait) return;
  INTRO.wait = false;
  clearTimeout(INTRO.timer);
  INTRO.t0 = performance.now();
  const tok = ++INTRO.token,
    show = typeof H3SHOW !== 'undefined' && H3SHOW && H3SHOW.loaded ? H3SHOW : null;
  // 사진이 있으면 바로 그 사진으로 (흐림 효과 없이 지금 모습 그대로, 서서히 나타나지 않고 바로)
  if (show) show.el.classList.add('ready', 'now', 'still');
  const cur = show && show.el.querySelector('.h3-slide.show');
  if (INTRO.mode === 'none') return introFinish(); // 동작 줄이기 + 3D: 사진이 준비되면 완성 화면을 바로
  if (INTRO.mode === 'fold3d') INTRO.fold = introFoldMake(cur && cur.naturalWidth ? cur.currentSrc || cur.src : '');
  introApply();
  const total = INTRO.mode === 'fold3d' ? MOTION.foldMs + 2 * MOTION.foldStagger : INTRO.mode === 'soft' ? MOTION.softMs + 240 : 300;
  INTRO.timer = setTimeout(() => {
    if (tok === INTRO.token) introFinish();
  }, total + 60);
}
// 지금 화면에 등장 효과를 붙여요. 등장 중에 화면이 다시 그려져도(저장된 계획을 늦게 불러온 경우 등) 이어서 진행돼요
function introApply() {
  const root = document.querySelector('.shell > .h3.h3-home'),
    bg = root && root.querySelector('.h3-bg');
  if (!root || !root.querySelector('.h3-hero')) return introFinish();
  if (INTRO.wait) {
    root.classList.add('intro-wait');
    return;
  }
  root.classList.remove('intro-wait');
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
  INTRO.wait = false;
  document.querySelectorAll('.h3.intro-fold3d, .h3.intro-soft, .h3.intro-soft-r, .h3.intro-wait').forEach(r => {
    r.classList.remove('intro-fold3d', 'intro-soft', 'intro-soft-r', 'intro-wait', 'intro-none');
    r.style.removeProperty('--it');
  });
  document.querySelectorAll('.h3-bg.folding').forEach(b => b.classList.remove('folding'));
  if (typeof h3ShowReveal === 'function') h3ShowReveal();
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  introFinish();
  // 탭이 뒤로 숨으면 진행 중인 전환은 끝 모습으로 보내고 잔상을 치워요 (돌아왔을 때 투명·멈춤 상태가 남지 않게)
  if (typeof mvCancel === 'function') mvCancel(true);
});
window.addEventListener('popstate', introFinish);
window.addEventListener('hashchange', introFinish);
if (MQ_REDUCE.addEventListener) MQ_REDUCE.addEventListener('change', introFinish);

// ---------------------------------------------------------------- 화면 전환 (모든 움직임은 여기서)
// render() 는 그대로 바로 새 화면을 그려요(기다리지 않아요). 그 앞뒤에서:
//   motionBefore: 바뀐 상태(S)를 지난번 화면과 비교해 「어떤 전환인지」 정하고, 사라질 화면의 위치·높이를 기억
//   motionAfter : 새 화면이 생긴 뒤 바뀐 부분에만 짧게 움직임을 붙여요
// 전환 종류
//   page  : 큰 화면 이동 (홈 메뉴·새 여행 단계·계획 탭·다른 여행). 앞으로는 오른쪽에서, 뒤로는 왼쪽에서. 이전 화면은 장식 층으로 잠깐 남아 흐려져요
//   sub   : 같은 화면 안 내용만 바뀜 (일차·동네 분류·달력 달·길안내 저장 안내 → 안내). 실제로 바뀐 칸만 움직여요
//   sel   : 일정 카드 펼치기·접기 (높이가 부드럽게)
//   sheet : 열기 / 닫기 / 상세로 들어가기 / 이전으로 돌아오기 / 같은 종류 다른 내용 / 시트 안 탭
// 빠르게 여러 번 누르면 진행 중인 효과는 바로 정리하고 마지막 목적지만 보여 줘요
const MV = { last: null, plan: null, anims: [], ghosts: [], timers: [], live: null, opener: null, tok: 0, gate: null, temp: [], log: [], lastError: null };
const MV_HOME = ['home', 'prep', 'areas', 'trips'],
  MV_PLAN = ['sched', 'map', 'guide', 'fare'],
  MV_SEG = ['city', 'outer', 'trip', 'wish'];
// 시트 안에서 「다른 내용」으로 보는 값 (검색어·입력값·체크 목록은 넣지 않아요)
const MV_SHEET_ID = ['id', 'uid', 'li', 'ctx', 'k', 'title'],
  MV_SHEET_IN = ['cat', 'tab', 'mode', 'i', 'o', 'h', 'm', 'to', 'pick'];
// 비교용 글자: 객체를 그냥 String() 하면 모두 "[object Object]" 가 돼서 바뀐 걸 못 알아채요
function mvVal(v) {
  if (v == null) return '';
  if (typeof v !== 'object') return String(v);
  if (v.id != null) return 'id:' + v.id;
  if (v.uid != null) return 'uid:' + v.uid;
  try {
    return JSON.stringify(v).slice(0, 160);
  } catch (e) {
    return '?';
  }
}

function mvReduce() {
  return motionReduced();
}
// 지금 상태의 「전환 열쇠」: 모두 글자·숫자라서 나중에 상태가 바뀌어도 비교가 흔들리지 않아요
function mvState() {
  const v = S.view,
    st = { page: '', fam: v, ord: 0, sub: '', so: 0, zone: 'main', sel: '', sh: null, sid: '', sin: '', sio: 0, depth: 0 };
  if (v === 'home') {
    const t = S.htab || 'home';
    st.page = 'home:' + t;
    st.ord = Math.max(0, MV_HOME.indexOf(t));
    st.zone = 'home';
    if (t === 'areas') {
      st.sub = 'seg:' + (S.aseg || 'city');
      st.so = MV_SEG.indexOf(S.aseg || 'city');
    }
  } else if (v === 'dates') {
    st.page = 'dates';
    st.ord = 10;
    const c = (S.draft && S.draft.cal) || '';
    st.sub = 'cal:' + c;
    st.so = Number(String(c).replace(/\D/g, '').slice(0, 6)) || 0;
  } else if (v === 'areas') {
    st.page = 'areas';
    st.ord = 11;
  } else {
    const t = S.tab || 'sched',
      ti = Math.max(0, MV_PLAN.indexOf(t));
    st.page = 'plan:' + ((S.plan && S.plan.id) || '') + ':' + t;
    st.fam = 'plan';
    st.ord = 12 + ti / 10;
    st.sub = 'di:' + (S.di || 0) + (t === 'guide' ? ':' + (S.saved ? 1 : 0) : '');
    st.so = (S.di || 0) * 2 + (t === 'guide' && S.saved ? 1 : 0);
    st.sel = t === 'sched' && S.sel ? String(S.sel) : '';
  }
  const sh = S.sheet;
  if (sh) {
    st.sh = sh.type;
    st.sid = sh.type + '|' + MV_SHEET_ID.map(k => mvVal(sh[k])).join('|');
    st.sin = MV_SHEET_IN.map(k => mvVal(sh[k])).join('|');
    st.sio = Number(sh.i) || 0;
    st.depth = sh.back ? 1 : 0;
  }
  return st;
}
// 지난번과 비교해서 전환 종류 정하기
function mvClassify(a, b) {
  const r = { page: 0, sub: 0, sel: 0, sheet: '', dir: 1, sdir: 0, idir: 0, tab: false };
  if (!a) return r;
  if (a.page !== b.page) {
    r.page = 1;
    r.dir = b.ord > a.ord ? 1 : b.ord < a.ord ? -1 : 1;
    r.tab = a.fam === b.fam; // 같은 큰 화면 안 탭 이동은 조금 더 짧고 가볍게
  } else {
    if (a.sub !== b.sub) {
      r.sub = 1;
      r.dir = b.so > a.so ? 1 : b.so < a.so ? -1 : 0;
    }
    if (a.sel !== b.sel) r.sel = 1;
  }
  if (!a.sh && b.sh) r.sheet = 'open';
  else if (a.sh && !b.sh) r.sheet = 'close';
  else if (a.sh && b.sh) {
    if (a.sid !== b.sid) {
      r.sheet = b.depth > a.depth ? 'fwd' : b.depth < a.depth ? 'back' : 'swap';
      r.sdir = r.sheet === 'fwd' ? 1 : r.sheet === 'back' ? -1 : 0;
    } else if (a.sin !== b.sin) {
      r.sheet = 'in';
      r.idir = b.sio > a.sio ? 1 : b.sio < a.sio ? -1 : 0;
    }
  }
  return r;
}

// ---- 도우미 ----
// 시작 문(gate): 한 번의 전환에서 만든 효과들은 「멈춘 채 시작 모습」으로 기다렸다가,
// 새 화면이 실제로 한 번 그려진 다음 프레임에 함께 재생돼요(rAF 두 번). 무거운 첫 프레임 동안 효과 시간이 흘러가 버리지 않게.
// 프레임이 안 오는 경우(뒤로 숨은 탭 등)를 위해 MOTION.gateMax 뒤에도 열어요 — 이건 멈춤 방지용 보조 장치예요.
// 첫 프레임 붙잡기(MV_HOLD)는 시험 결과(같은 빌드에서 켜고 끄고 화면 녹화 비교) 눈에 띄는 차이가 없고
// 첫 반응만 10~25ms 늦어질 때가 있어 기본으로 꺼 두었어요. 끄면 효과는 만든 즉시 재생되고, 문은 시간 기준으로만 써요
const MV_HOLD = false;
function mvGate() {
  if (MV.gate && !MV.gate.done) return MV.gate;
  if (!MV_HOLD) {
    if (MV.gate && MV.gate.tok === MV.tok) return MV.gate;
    const g = { tok: MV.tok, anims: { push() {} }, done: true, startedAt: performance.now(), open() {} };
    MV.gate = g;
    return g;
  }
  const g = { tok: MV.tok, anims: [], done: false, startedAt: 0, raf: 0, wd: 0 };
  g.open = () => {
    if (g.done) return;
    g.done = true;
    cancelAnimationFrame(g.raf);
    clearTimeout(g.wd);
    g.startedAt = performance.now();
    g.anims.forEach(a => {
      if (!a.__dead && a.playState === 'paused') a.play();
    });
    g.anims = [];
  };
  g.raf = requestAnimationFrame(() => (g.raf = requestAnimationFrame(g.open)));
  g.wd = setTimeout(g.open, MOTION.gateMax);
  MV.gate = g;
  return g;
}
// 지금 진행 중인 전환이 실제로 몇 ms 재생됐는지 (아직 문이 안 열렸으면 0: 기다린 시간을 재생한 시간으로 치지 않아요)
function mvPlayed(g) {
  return g && g.done ? performance.now() - g.startedAt : 0;
}
// Web Animations 를 못 쓰는 브라우저용 대체: CSS 클래스로 짧게, 끝나면 'finish' 를 알려 줘요
function mvFallback(el, out) {
  const h = { playState: 'running', _l: { finish: [], cancel: [] }, onfinish: null, oncancel: null };
  const fire = t => {
    if (h.playState !== 'running') return;
    h.playState = t === 'finish' ? 'finished' : 'idle';
    el.classList.remove('mv-fb', 'mv-fb-out');
    h._l[t].forEach(f => f());
    if (h['on' + t]) h['on' + t]();
  };
  h.addEventListener = (t, f) => h._l[t] && h._l[t].push(f);
  h.finish = () => fire('finish');
  h.cancel = () => fire('cancel');
  h.play = h.pause = () => {};
  el.classList.remove('mv-fb', 'mv-fb-out');
  void el.offsetWidth;
  el.classList.add(out ? 'mv-fb-out' : 'mv-fb');
  el.addEventListener('animationend', function f(e) {
    if (e.target !== el) return;
    el.removeEventListener('animationend', f);
    fire('finish');
  });
  setTimeout(() => fire('finish'), 400); // animationend 가 안 와도 정리
  return h;
}
function mvAnim(el, frames, ms, opt = {}) {
  if (!el) return null;
  let a;
  try {
    if (!el.animate) {
      const first = frames[0] || {},
        last = frames[frames.length - 1] || {};
      const out = Number(last.opacity) === 0;
      if (!out && Number(first.opacity ?? 1) >= 0.99) return null; // 대체 효과는 흐려짐만
      a = mvFallback(el, out);
    } else {
      a = el.animate(frames, { duration: ms, easing: opt.easing || MOTION.ease, fill: opt.fill || 'backwards', delay: opt.delay || 0 });
      // 이어 재생(음수 delay)은 이미 재생 중인 시간을 반영하니 문을 기다리지 않아요
      if (!(opt.delay < 0) && !opt.now) {
        const g = mvGate();
        if (MV_HOLD) {
          a.pause();
          g.anims.push(a);
        }
      }
    }
  } catch (e) {
    mvReport('anim', e);
    return null;
  }
  MV.anims.push(a);
  const drop = () => {
    const i = MV.anims.indexOf(a);
    if (i >= 0) MV.anims.splice(i, 1);
  };
  a.addEventListener('finish', drop);
  a.addEventListener('cancel', drop);
  return a;
}
// 임시로 바꾼 스타일(높이 접기용 overflow 등)은 목록에 두었다가, 끝나거나 취소·오류 때 꼭 되돌려요
function mvTemp(el, props) {
  const keep = {};
  Object.keys(props).forEach(k => {
    keep[k] = el.style[k];
    el.style[k] = props[k];
  });
  const t = { el, keep };
  MV.temp.push(t);
  return () => {
    const i = MV.temp.indexOf(t);
    if (i < 0) return;
    MV.temp.splice(i, 1);
    Object.assign(el.style, keep);
  };
}
function mvReport(where, e) {
  MV.lastError = { where, msg: String((e && e.message) || e), at: new Date().toISOString() };
  console.error('[motion] ' + where + ' 오류 — 화면은 그대로 쓰고 효과만 건너뛰어요', e);
}
function mvLater(fn, ms) {
  const t = setTimeout(() => {
    MV.timers = MV.timers.filter(x => x !== t);
    fn();
  }, ms);
  MV.timers.push(t);
}
// 진행 중인 효과를 모두 정리 (새 전환이 시작될 때 · 동작 줄이기로 바뀔 때)
// 이 앱의 전환이 만든 것만 정리해요 (첫 화면 등장 효과·배경 물결 같은 CSS 장식은 건드리지 않아요)
// finish=true 면 끝 모습으로 보내고(탭 숨김 등), 아니면 취소해서 원래(최종) 스타일로 돌아가요
function mvCancel(finish) {
  if (MV.gate && !MV.gate.done) {
    MV.gate.done = true;
    cancelAnimationFrame(MV.gate.raf);
    clearTimeout(MV.gate.wd);
  }
  MV.gate = null;
  MV.anims.slice().forEach(a => {
    a.__dead = true;
    try {
      finish ? a.finish() : a.cancel();
    } catch (e) {
      try {
        a.cancel();
      } catch (e2) {}
    }
  });
  MV.anims = [];
  MV.ghosts.forEach(g => g.el.remove());
  MV.ghosts = [];
  MV.temp.slice().forEach(t => {
    Object.assign(t.el.style, t.keep);
  });
  MV.temp = [];
  MV.timers.forEach(clearTimeout);
  MV.timers = [];
  MV.live = null;
  MV.shLive = null;
}
function mvHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h + ':' + s.length;
}
// 바뀐 칸 찾기용 지문 (몇 단계 아래까지)
function mvSig(el, depth) {
  return { h: mvHash(el.outerHTML), c: depth > 0 ? [...el.children].map(c => mvSig(c, depth - 1)) : null };
}
// 움직이면 안 되는 것: 탭 줄·일차 버튼 줄·입력칸 등 (눌러서 바뀌는 표시만 바뀌어요)
const MV_SKIP = '[role=tablist],.days,.ptabs,.h3-seg,.seg,.tabs,.chips-sel,.xpick,.handle,.sh-x,input,select,textarea,.cal-h';
function mvChanged(old, el, depth, out) {
  if (!old || !el) return out;
  if (mvHash(el.outerHTML) === old.h) return out;
  if (el.matches(MV_SKIP)) return out;
  const kids = [...el.children];
  if (depth > 0 && old.c && old.c.length === kids.length && kids.length > 1) {
    const before = out.length;
    kids.forEach((k, i) => mvChanged(old.c[i], k, depth - 1, out));
    // 모든 칸이 바뀌었으면 묶음째로
    if (out.length - before === kids.length) out.splice(before, kids.length, el);
    return out;
  }
  out.push(el);
  return out;
}
// root 바로 아래(또는 조금 아래)에서 바뀐 「의미 있는 묶음」만 (root 전체·탭 줄·입력칸은 빼요)
function mvChangedIn(old, root, depth) {
  const out = [];
  if (!old || !old.c) return out;
  const kids = [...root.children];
  kids.forEach((k, i) => {
    const o = old.c[i];
    if (k.matches(MV_SKIP) || k.classList.contains('handle')) return;
    if (!o) return out.push(k);
    if (depth > 1) mvChanged(o, k, depth - 2, out);
    else if (mvHash(k.outerHTML) !== o.h) out.push(k);
  });
  return out;
}
function mvHasFixed(el) {
  if (getComputedStyle(el).position === 'fixed') return true;
  const all = el.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) if (getComputedStyle(all[i]).position === 'fixed') return true;
  return false;
}
// 큰 화면에서 바뀌는 칸 (고정 메뉴·버튼·상단 바는 빼요)
function mvZones() {
  const shell = document.querySelector('#app > .shell');
  return shell ? [...shell.querySelectorAll(':scope > .h3 > .h3-bg, :scope > .h3 > .h3-pages, :scope > .h3 > .h3-band, :scope > .h3 > .h3-page, :scope > main.scr')] : [];
}
function mvSubZone() {
  return document.querySelector('#app > .shell > main.scr, #app > .shell > .h3 > .h3-page');
}
function mvSheet() {
  return document.querySelector('#app .sheet');
}
// 장식 층으로 남길 때: 같은 이름(id)이 두 번 생기지 않게, 눌리거나 읽히지 않게
function mvInertCopy(node) {
  node.querySelectorAll('[id]').forEach(n => {
    const o = n.id;
    n.id = o + '-mvg';
    node.querySelectorAll(`[fill="url(#${o})"],[stroke="url(#${o})"]`).forEach(x => {
      if (x.getAttribute('fill') === `url(#${o})`) x.setAttribute('fill', `url(#${o}-mvg)`);
      if (x.getAttribute('stroke') === `url(#${o})`) x.setAttribute('stroke', `url(#${o}-mvg)`);
    });
  });
  if (node.id) node.removeAttribute('id');
  [node, ...node.querySelectorAll('[role=dialog],[aria-modal]')].forEach(n => {
    if (n.getAttribute('role') === 'dialog') n.removeAttribute('role');
    n.removeAttribute('aria-modal');
  });
}
function mvGhostWrap(kind, z) {
  const g = document.createElement('div');
  g.className = 'mv-ghost mv-' + kind;
  g.setAttribute('aria-hidden', 'true');
  g.inert = true;
  g.style.zIndex = z;
  document.body.appendChild(g);
  MV.ghosts.push({ kind, el: g });
  return g;
}
function mvGhostKill(g) {
  g.remove();
  MV.ghosts = MV.ghosts.filter(x => x.el !== g);
}
function mvGhostDrop(g, ms) {
  mvLater(() => {
    g.remove();
    MV.ghosts = MV.ghosts.filter(x => x.el !== g);
  }, ms);
}

// ---------------------------------------------------------------- render 바로 전
function motionBefore() {
  try {
    mvBefore();
  } catch (e) {
    mvReport('motionBefore', e);
    mvCancel();
    MV.t = null;
    MV.pres = null;
    MV.out = null;
  }
}
function motionAfter() {
  try {
    mvAfter();
  } catch (e) {
    mvReport('motionAfter', e);
    // 쓸 수 있는 최종 화면으로: 남은 효과·잔상·임시 스타일 정리, 다음 비교를 위해 지금 상태 기록
    mvCancel();
    try {
      MV.last = mvState();
    } catch (e2) {
      MV.last = null;
    }
    MV.t = MV.next = MV.out = MV.subSig = MV.shSig = MV.selH = MV.pres = null;
    const w = document.getElementById('toasts');
    if (w && MV.toasts) MV.toasts.forEach(x => w.appendChild(x));
    MV.toasts = null;
    if (INTRO.run) introFinish();
  }
}
function mvBefore() {
  const cur = mvState(),
    t = mvClassify(MV.last, cur);
  MV.t = t;
  MV.next = cur;
  const busy = t.page || t.sub || t.sel || (t.sheet && t.sheet !== 'close');
  if (busy || t.sheet === 'close') {
    mvCancel();
    MV.tok++; // 이 전환의 번호: 오래된 콜백은 번호가 달라 무시돼요
  }
  // 알림(토스트)은 화면을 다시 그려도 사라지지 않게 데려가요
  MV.toasts = [...document.querySelectorAll('#toasts > .toast')];
  // 같은 화면·같은 창에서 일부만 바뀌는 경우: 새로 생기거나 없어지는 칸을 찾으려고 지금 모양을 기억
  const plain = !t.page && !t.sub && !t.sel && !t.sheet && !INTRO.run;
  MV.pres = plain ? mvPresSnap() : null;
  if (mvReduce()) return; // 동작 줄이기: 위치 기억은 필요 없음 (짧게 흐려지기만)
  const old = document.querySelector('#app > .shell');
  if (!old) return;
  // 큰 화면 이동: 사라질 칸의 자리·스크롤을 기억해 두었다가 장식 층으로 잠깐 남겨요
  if (t.page) {
    MV.out = mvZones().map(el => {
      const r = el.getBoundingClientRect(),
        chain = [];
      for (let p = el.parentElement; p && p.id !== 'app'; p = p.parentElement) chain.unshift(p.className);
      // 홈 배경 사진은 새 화면으로 옮겨 가니, 사라지는 화면에는 지금 사진을 복사해 둬요 (그림으로 바뀌어 번쩍이지 않게)
      const show = el.querySelector('.h3-show.ready'),
        photo = show ? show.cloneNode(true) : null;
      if (photo) photo.classList.add('still');
      return { el, r, chain, photo, st: el.scrollTop, fixed: getComputedStyle(el).position === 'fixed' };
    });
  }
  if (t.sub) {
    const z = mvSubZone();
    MV.subSig = z ? mvSig(z, 1) : null;
  }
  if (t.sel) {
    MV.selH = {};
    [MV.last.sel, cur.sel].forEach(u => {
      const li = u && document.getElementById('it-' + u);
      if (li) MV.selH[u] = li.offsetHeight;
    });
  }
  const sh = mvSheet();
  if (sh && t.sheet && t.sheet !== 'open') {
    MV.shH = sh.offsetHeight;
    if (t.sheet === 'in') MV.shSig = mvSig(sh, 3);
  }
  if (t.sheet === 'close' && sh) {
    const sc = sh.previousElementSibling && sh.previousElementSibling.classList.contains('scrim') ? sh.previousElementSibling : null;
    MV.closing = { parts: [sc, sh].filter(Boolean), top: sh.scrollTop };
  }
  if (t.sheet === 'open') {
    const a = document.activeElement;
    MV.opener = a && a.dataset && a.dataset.act ? mvSelector(a) : null;
  }
}
function mvSelector(a) {
  let s = `[data-act="${a.dataset.act}"]`;
  ['id', 'uid', 't', 'i', 'li', 'c', 'k', 'v'].forEach(k => {
    if (a.dataset[k] != null) s += `[data-${k}="${String(a.dataset[k]).replace(/"/g, '\\"')}"]`;
  });
  return s;
}

// ---------------------------------------------------------------- render 바로 뒤
function mvAfter() {
  const cur = MV.next || mvState(),
    prev = MV.last,
    t = MV.t || mvClassify(prev, cur);
  MV.last = cur;
  MV.t = null;
  MV.next = null;

  // 첫 화면 등장 효과 (그대로)
  if (INTRO.first) {
    INTRO.first = false;
    if (cur.page === 'home:home' && !S.sheet && !S.h3p2 && !/#share=/.test(location.hash)) introStart();
  } else if (INTRO.run) {
    if ((prev && cur.page !== prev.page) || S.sheet) introFinish();
    else introApply();
  }
  const R = mvReduce(),
    now = performance.now();
  // 알림 다시 붙이기
  if (MV.toasts && MV.toasts.length) {
    const w = document.getElementById('toasts');
    if (w) MV.toasts.forEach(x => w.appendChild(x));
  }
  MV.toasts = null;
  if (MV.pres) mvPresDiff(MV.pres, R);
  MV.pres = null;

  if (t.page) mvPage(t, R);
  else if (MV.live && !t.sub && !t.sheet && mvPlayed(MV.live.g) < MV.live.ms) {
    // 전환 도중 데이터가 와서 같은 화면을 다시 그렸으면: 새로 생긴 칸에 이어서
    // 아직 시작 전이면 같은 문에서 함께 시작, 재생 중이면 재생된 만큼만 앞당겨서 (기다린 시간은 빼고)
    const L = MV.live,
      p = mvPlayed(L.g);
    mvZones().forEach(el => mvEnterEl(el, L.dx, L.ms, L.g.done ? -p : 0, R));
  }
  if (t.sub) mvSub(t, R);
  if (t.sel) mvSel(prev, cur, R);
  if (t.sheet === 'open') mvSheetOpen(R);
  else if (t.sheet === 'close') mvSheetClose(R);
  else if (t.sheet) mvSheetMove(t, R);
  else if (MV.shLive && cur.sh && mvPlayed(MV.shLive.g) < MOTION.sheetMs) {
    // 시트가 올라오는 도중 다시 그려졌으면 이어서 올라오게 (시작 전이면 같은 문에서)
    const g = MV.shLive.g;
    mvSheetOpen(R, g.done ? -mvPlayed(g) : 0, true);
  }
  mvLog(t);
  MV.out = null;
  MV.subSig = null;
  MV.shSig = null;
  MV.selH = null;
}

// 큰 화면 이동
function mvEnterEl(el, dx, ms, delay, R) {
  const fixed = getComputedStyle(el).position === 'fixed';
  const move = !R && dx && !fixed && !mvHasFixed(el);
  mvAnim(
    el,
    move ? [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }] : [{ opacity: fixed ? 0.35 : 0 }, { opacity: 1 }],
    R ? Math.min(ms, 160) : ms,
    { delay }
  );
}
function mvPage(t, R) {
  const ms = t.tab ? MOTION.tabMs : MOTION.pageMs,
    sh = t.tab ? MOTION.tabShift : MOTION.pageShift,
    dx = t.dir * sh;
  // 이전 화면: 눌리지 않는 장식 층으로 남아 반대쪽으로 살짝 밀리며 흐려져요
  if (!R && MV.out) {
    const g = mvGhostWrap('page', 15);
    MV.out.forEach(o => {
      if (o.el.isConnected) return;
      // 원래 부모의 이름(class)을 똑같이 감싸서 모양이 그대로 보이게
      let host = g;
      o.chain.forEach(c => {
        const d = document.createElement('div');
        d.className = c;
        d.style.cssText = 'position:static;margin:0;padding:0;min-height:0;height:auto;max-width:none;background:none;border:0;box-shadow:none';
        host.appendChild(d);
        host = d;
      });
      mvInertCopy(o.el);
      Object.assign(o.el.style, {
        position: 'fixed',
        left: o.r.left + 'px',
        top: o.r.top + 'px',
        width: o.r.width + 'px',
        height: o.r.height + 'px',
        margin: '0',
        transform: 'none',
        zIndex: o.fixed ? '0' : '1'
      });
      if (o.photo) {
        const slot = o.el.querySelector('.h3-slot');
        if (slot) slot.appendChild(o.photo);
      }
      host.appendChild(o.el);
      if (o.st) o.el.scrollTop = o.st;
      // 이전 화면은 빨리 빠지고(겹쳐 보이는 시간을 짧게), 새 화면은 아주 조금 뒤에 들어와요
      const an = mvAnim(o.el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dx * 0.5}px)` }], ms * MOTION.outPart, {
        easing: MOTION.easeOut,
        fill: 'forwards'
      });
      if (an) an.addEventListener('finish', () => mvGhostKill(g));
    });
    mvGhostDrop(g, ms + MOTION.gateMax + 400); // 혹시 끝 알림이 없을 때를 위한 안전장치
  }
  mvZones().forEach(el => mvEnterEl(el, dx, ms, R ? 0 : MOTION.inDelay, R));
  MV.live = { g: mvGate(), ms, dx };
}
// 같은 화면 안 내용 바꾸기: 실제로 바뀐 칸만
function mvSub(t, R) {
  const z = mvSubZone();
  if (!z) return;
  // 글자 몇 개가 아니라 바뀐 묶음(일차 요약 카드, 일정 목록, 달력, 동네 목록)째로
  const els = MV.subSig ? mvChangedIn(MV.subSig, z, 1) : [z];
  const dx = R ? 0 : t.dir * MOTION.subShift;
  els.forEach(el =>
    mvAnim(
      el,
      dx ? [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }],
      R ? Math.min(MOTION.subMs, 160) : MOTION.subMs
    )
  );
}
// 일정 카드 펼치기·접기: 카드 높이가 부드럽게
function mvSel(prev, cur, R) {
  if (R || !MV.selH) return;
  [prev && prev.sel, cur.sel].forEach(u => {
    const li = u && document.getElementById('it-' + u),
      h0 = u && MV.selH[u];
    if (!li || !h0) return;
    const h1 = li.offsetHeight;
    if (Math.abs(h1 - h0) < 2) return;
    li.style.overflow = 'hidden';
    const a = mvAnim(li, [{ height: h0 + 'px' }, { height: h1 + 'px' }], MOTION.expandMs);
    const done = () => (li.style.overflow = '');
    if (a) {
      a.addEventListener('finish', done);
      a.addEventListener('cancel', done);
    }
    const ed = u === cur.sel && li.querySelector('.edit');
    if (ed) mvAnim(ed, [{ opacity: 0 }, { opacity: 1 }], MOTION.expandMs);
  });
}

// ---- 시트 ----
function mvSheetOpen(R, delay = 0, cont) {
  const sh = mvSheet(),
    sc = document.querySelector('#app .scrim');
  if (!sh) return;
  const base = getComputedStyle(sh).transform;
  const b = base && base !== 'none' ? base : '';
  if (sc) mvAnim(sc, [{ opacity: 0 }, { opacity: 1 }], R ? 160 : MOTION.sheetMs, { delay, easing: 'linear' });
  mvAnim(
    sh,
    R ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: `${b} translateY(${MOTION.sheetRise}px)`, opacity: 0 }, { transform: b || 'none', opacity: 1 }],
    R ? 160 : MOTION.sheetMs,
    { delay }
  );
  if (!cont) MV.shLive = { g: mvGate() };
}
function mvSheetClose(R) {
  MV.shLive = null;
  const c = MV.closing;
  MV.closing = null;
  // 닫은 뒤 포커스: 시트를 열었던 버튼으로 돌려줘요 (있을 때만)
  if (MV.opener) {
    const b = document.querySelector('#app ' + MV.opener);
    MV.opener = null;
    if (b && (!document.activeElement || document.activeElement === document.body)) b.focus({ preventScroll: true });
  }
  if (R || !c || c.parts.some(p => p.isConnected)) return;
  const g = mvGhostWrap('sheet', 42);
  c.parts.forEach(p => {
    mvInertCopy(p);
    p.classList.add('sh-ghost');
    g.appendChild(p);
  });
  const gs = g.querySelector('.sheet');
  if (gs) gs.scrollTop = c.top;
  const sc = g.querySelector('.scrim');
  if (sc) mvAnim(sc, [{ opacity: 1 }, { opacity: 0 }], MOTION.sheetMs, { easing: 'linear' });
  if (gs) {
    const b = getComputedStyle(gs).transform,
      base = b && b !== 'none' ? b : '';
    const an = mvAnim(gs, [{ transform: base || 'none', opacity: 1 }, { transform: `${base} translateY(${MOTION.sheetRise + 8}px)`, opacity: 0 }], MOTION.sheetMs * 0.85, {
      easing: MOTION.easeOut,
      fill: 'forwards'
    });
    if (an) an.addEventListener('finish', () => mvGhostKill(g));
  }
  if (sc) sc.getAnimations().forEach(a => (a.effect.updateTiming({ fill: 'forwards' })));
  mvGhostDrop(g, MOTION.sheetMs + MOTION.gateMax + 400);
}
// 열린 시트 안에서 이동: 틀(배경·위치)은 그대로, 높이는 부드럽게, 내용만 바뀌어요
function mvSheetMove(t, R) {
  const sh = mvSheet();
  if (!sh) return;
  const kids = t.sheet === 'in' && MV.shSig ? mvChangedIn(MV.shSig, sh, 3) : [...sh.children].filter(c => !c.classList.contains('handle'));
  const dx = R ? 0 : t.sheet === 'in' ? t.idir * MOTION.subShift : t.sdir * MOTION.sheetInnerShift;
  const ms = t.sheet === 'in' ? MOTION.subMs : MOTION.sheetInnerMs;
  kids.forEach(el =>
    mvAnim(
      el,
      dx
        ? [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }]
        : [{ opacity: 0, transform: t.sheet === 'swap' && !R ? 'translateY(6px)' : 'none' }, { opacity: 1, transform: 'none' }],
      R ? Math.min(ms, 140) : ms
    )
  );
  // 높이 변화
  const h0 = MV.shH,
    h1 = sh.offsetHeight;
  if (!R && h0 && Math.abs(h1 - h0) > 4) {
    const a = mvAnim(sh, [{ height: h0 + 'px' }, { height: h1 + 'px' }], ms);
    if (a) sh.style.overflowY = 'hidden';
    const done = () => (sh.style.overflowY = '');
    if (a) {
      a.addEventListener('finish', done);
      a.addEventListener('cancel', done);
    }
  }
}

// ---------------------------------------------------------------- <details> 펼치기·접기
// 보류함·도움말·공유 고급 등: 높이가 부드럽게 바뀌어요. 상태(S.openParked 등)는 원래처럼 'toggle' 로 저장돼요
document.addEventListener(
  'click',
  e => {
    const sm = e.target.closest && e.target.closest('summary');
    if (!sm || mvReduce()) return;
    const d = sm.parentElement;
    if (!d || d.tagName !== 'DETAILS' || d.hasAttribute('data-noanim') || !d.closest('#app')) return;
    if (!d.animate) return; // 애니메이션을 못 쓰면 원래대로 바로 펼치고 접혀요
    e.preventDefault();
    try {
      if (d._mv) d._mv.cancel();
      const h0 = d.offsetHeight,
        opening = !d.open;
      if (opening) d.open = true;
      const cs = getComputedStyle(d);
      const h1 = opening ? d.offsetHeight : sm.offsetHeight + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      const undo = mvTemp(d, { overflow: 'hidden' });
      const a = mvAnim(d, [{ height: h0 + 'px' }, { height: h1 + 'px' }], MOTION.expandMs, { now: true });
      if (!a) {
        undo();
        if (!opening) d.open = false;
        return;
      }
      d._mv = a;
      let ended = false;
      const end = ok => {
        if (ended) return;
        ended = true;
        undo();
        d._mv = null;
        if (!opening) d.open = false; // 취소돼도 사용자가 누른 결과(접힘)는 지켜요
      };
      a.addEventListener('finish', () => end(true));
      a.addEventListener('cancel', () => end(false));
    } catch (err) {
      mvReport('details', err);
      d.style.overflow = '';
    }
  },
  true
);

// 동작 줄이기로 바뀌면 진행 중인 효과를 모두 정리
if (MQ_REDUCE.addEventListener) MQ_REDUCE.addEventListener('change', () => mvCancel());


// ---------------------------------------------------------------- 나타나고 사라지는 칸 (같은 화면·같은 창 안)
// 결과 배너, 검색 결과·오류 안내, 메모·좌표칸, 추가 옵션, 공유 코드처럼 조건에 따라 생기고 없어지는 칸을
// 화면을 다시 그리기 전후 모양으로 비교해서 「새로 생긴 칸」은 높이+흐림으로 나타나고, 「없어진 칸」은 접히며 사라져요
// 글자만 바뀌는 칸(입력 중인 글자, 숫자)은 건드리지 않아요. 순서만 바뀐 칸(일정 끌어 옮기기)도 그대로예요
const MV_STATE_CLS = /^(on|sel|active|open|show|dis|done|ok|bad|warn|cur|now|ready|still|hid|off|err|busy|picked|checked|enter|top|leave|kb\d|in|out|lit|hot|me|first|last|sh-in|sh-ghost|mv-fb|mv-out|dragging|drop|over|ph|has-ph|wide|end)$/;
const MV_NODIFF = 'svg,canvas,iframe,input,select,textarea,.maplibregl-map,.h3-bg,.h3-show,.toasts,.h3-fold,.mv-out,[data-mvskip]';
// 글자가 바뀌면 살짝 바꿔 보여 주는 칸 (공유 코드·안내 문구 등)
const MV_SWAP = '.sc-code,.sc-ja,.xlabel,.hp-msg,.note,.fd-tx,.q,.desc,.sp-st,.recs';
// 반드시 효과가 있어야 하는 칸 (많이 바뀌는 경우에도 따로 나타나고 사라져요)
const MV_MUST = '.banner,.note,.hp-msg,.hp-res,.here-loc,.here-opts,.selchips,.card.parked,.wh-pin,.sh-foot,.recs,.alts,.osteps,.gsteps';
// 칸의 정체: 태그 + 맨 앞 이름(class) + 버튼 동작·대상. 뒤에 붙는 상태 이름(on, s, e …)은 보지 않아요
function mvKeyOf(el) {
  const c = [...el.classList].find(x => !MV_STATE_CLS.test(x)) || '',
    d = el.dataset || {};
  return el.tagName + '.' + c + '|' + (d.act || '') + '|' + (d.id || d.uid || d.li || d.k || d.v || d.i || '');
}
function mvPresSnap() {
  const root = document.querySelector('#app > .shell');
  if (!root) return null;
  let n = 0;
  const walk = (el, depth) => {
    if (++n > 5000) throw 0;
    const h = el.offsetHeight,
      o = { el, k: mvKeyOf(el), h, r: h ? el.getBoundingClientRect() : null, kids: null, txt: null };
    if (el.matches(MV_SWAP)) o.txt = el.textContent;
    if (depth < 14 && !el.matches(MV_NODIFF)) o.kids = [...el.children].filter(c => !c.classList.contains('mv-out')).map(c => walk(c, depth + 1));
    return o;
  };
  try {
    return walk(root, 0);
  } catch (e) {
    return null; // 너무 큰 화면은 비교하지 않아요
  }
}
// 두 목록 맞추기 (가장 긴 공통 순서)
function mvLCS(a, b) {
  const n = a.length,
    m = b.length;
  if (n * m > 40000) return null;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) pairs.push([i++, j++]);
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}
function mvPresDiff(old, R) {
  const root = document.querySelector('#app > .shell');
  if (!old || !root || mvKeyOf(root) !== old.k) return;
  const ins = [],
    rem = [],
    swp = [];
  const walk = (o, el) => {
    if (o.txt != null && el.textContent !== o.txt) swp.push(el);
    if (!o.kids || el.matches(MV_NODIFF)) return;
    const nk = [...el.children],
      pairs = mvLCS(
        o.kids.map(x => x.k),
        nk.map(mvKeyOf)
      );
    if (!pairs) return;
    const mo = new Set(pairs.map(p => p[0])),
      mn = new Set(pairs.map(p => p[1]));
    nk.forEach((c, j) => mn.has(j) || ins.push(c));
    o.kids.forEach((c, i) => {
      if (mo.has(i)) return;
      // 다음에 오는 짝지어진 칸 앞에 다시 끼워 접히게
      let ref = null;
      for (const p of pairs)
        if (p[0] > i) {
          ref = nk[p[1]];
          break;
        }
      rem.push({ o: c, parent: el, ref });
    });
    pairs.forEach(([i, j]) => walk(o.kids[i], nk[j]));
  };
  walk(old, root);
  // 순서만 바뀐 칸은 빼요
  const ik = new Set(ins.map(mvKeyOf)),
    rk = new Set(rem.map(r => r.o.k)),
    moved = k => k.split('|')[2] && ik.has(k) && rk.has(k);
  const I = ins.filter(e => !moved(mvKeyOf(e)) && e.namespaceURI !== 'http://www.w3.org/2000/svg' && mvBlock(e)),
    X = rem.filter(r => !moved(r.o.k));
  if (I.length + X.length > 40) {
    // 한꺼번에 많이 바뀌면(목록 전체 교체 등) 항목마다가 아니라 묶음(부모)째로 짧게 흐려졌다 나타나요.
    // 꼭 보여야 하는 칸(배너·안내·검색 결과 등)은 따로 나타나요
    const must = I.filter(e => e.matches(MV_MUST));
    const parents = [...new Set(I.filter(e => !must.includes(e)).map(e => e.parentElement))].filter(p => p && p !== root && !must.some(m => p.contains(m)));
    parents.slice(0, 6).forEach(p => mvAnim(p, [{ opacity: 0.3 }, { opacity: 1 }], R ? 120 : MOTION.subMs));
    must.forEach(e => mvPresIn(e, R));
    X.filter(r => r.o.el.matches && r.o.el.matches(MV_MUST)).forEach(r => mvPresOut(r, R));
    return;
  }
  I.forEach(e => mvPresIn(e, R));
  X.forEach(r => mvPresOut(r, R));
  swp.filter(e => !I.some(x => x.contains(e))).forEach(e => mvAnim(e, [{ opacity: 0.25 }, { opacity: 1 }], R ? 120 : MOTION.subMs));
}
// 줄 안에 놓인 작은 버튼·배지는 높이를 접지 않고 흐려지기만
function mvSmall(el, cs) {
  if (/inline/.test(cs.display) || el.offsetWidth < 90) return true;
  const p = el.parentElement && getComputedStyle(el.parentElement);
  return !!p && (p.display.includes('grid') || (p.display.includes('flex') && p.flexDirection.startsWith('row')));
}
// 가로로 늘어선 줄·격자 안(달력, 칩 줄)에는 사라지는 칸을 끼워 넣지 않아요 (옆 칸이 밀리지 않게)
function mvRowParent(p) {
  const cs = getComputedStyle(p);
  return cs.display.includes('grid') || (cs.display.includes('flex') && cs.flexDirection.startsWith('row')) || /inline/.test(cs.display);
}
function mvBlock(el) {
  const d = getComputedStyle(el).display;
  return d !== 'inline' && d !== 'contents' && d !== 'none' && !d.startsWith('table-');
}
// 새로 생긴 칸: 높이 0 → 원래 높이, 흐림 → 또렷
function mvPresIn(el, R) {
  const cs = getComputedStyle(el),
    pos = cs.position;
  if (R) return mvAnim(el, [{ opacity: 0 }, { opacity: 1 }], 120);
  if (pos === 'fixed' || pos === 'absolute') return mvAnim(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], MOTION.noteMs);
  const h = el.offsetHeight;
  if (!h || h > 360 || mvSmall(el, cs)) return mvAnim(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], MOTION.panelMs);
  mvCollapse(el, cs, h, true);
}
// 높이 접기·펼치기 공통 (안쪽 여백·바깥 여백도 함께)
function mvCollapse(el, cs, h, open, done) {
  const full = { height: h + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: 1 },
    zero = { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', opacity: 0 };
  const undo = mvTemp(el, { overflow: 'hidden', boxSizing: 'border-box' });
  const a = mvAnim(el, open ? [zero, full] : [full, zero], MOTION.panelMs, { easing: open ? MOTION.ease : MOTION.easeOut, fill: open ? 'backwards' : 'forwards' });
  const end = () => {
    undo();
    if (done) done();
  };
  if (a) {
    a.addEventListener('finish', end);
    a.addEventListener('cancel', end);
  } else end();
  return a;
}
// 없어진 칸: 그 자리에 잠깐 남아(눌리지 않음) 접히며 사라져요
function mvPresOut(r, R) {
  const node = r.o.el,
    h = r.o.h;
  if (R || !h || !r.parent.isConnected) return;
  // 가로 줄·격자 안이거나 큰 칸이면: 레이아웃을 밀지 않도록 원래 자리 위에 떠 있는 장식 층으로 흐려지게
  if (h > 360 || mvRowParent(r.parent)) return mvPresOutOverlay(r);
  if (r.ref && r.ref.parentElement !== r.parent) r.ref = null;
  mvInertCopy(node);
  node.classList.add('mv-out');
  node.setAttribute('aria-hidden', 'true');
  node.inert = true;
  r.parent.insertBefore(node, r.ref);
  const cs = getComputedStyle(node),
    pos = cs.position;
  const g = { kind: 'out', el: node };
  MV.ghosts.push(g);
  const kill = () => {
    node.remove();
    MV.ghosts = MV.ghosts.filter(x => x !== g);
  };
  if (pos === 'fixed' || pos === 'absolute' || mvSmall(node, cs)) {
    const a = mvAnim(node, [{ opacity: 1 }, { opacity: 0, transform: pos === 'fixed' || pos === 'absolute' ? 'translateY(8px)' : 'none' }], MOTION.noteMs, { easing: MOTION.easeOut, fill: 'forwards' });
    if (a) a.addEventListener('finish', kill);
    else kill();
  } else if (!mvCollapse(node, cs, h, false, kill)) kill();
  mvLater(kill, MOTION.panelMs + MOTION.gateMax + 400);
}
// 원래 자리(화면 좌표)에 고정된 장식 층으로 남겨 흐려지게 (부모 이름을 똑같이 감싸 모양 유지)
function mvPresOutOverlay(r) {
  const node = r.o.el,
    rect = r.o.r;
  if (!rect || rect.bottom < 0 || rect.top > innerHeight) return;
  const chain = [];
  for (let p = node.parentElement; p && p.id !== 'app' && !p.classList.contains('shell'); p = p.parentElement) chain.unshift(p.className);
  chain.unshift('shell ' + ((document.querySelector('#app > .shell') || {}).className || '').replace('shell', ''));
  const g = mvGhostWrap('out', 14);
  let host = g;
  chain.forEach(c => {
    const d = document.createElement('div');
    d.className = c;
    d.style.cssText = 'position:static;margin:0;padding:0;min-height:0;height:auto;max-width:none;background:none;border:0;box-shadow:none;display:block';
    host.appendChild(d);
    host = d;
  });
  mvInertCopy(node);
  Object.assign(node.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', margin: '0' });
  host.appendChild(node);
  const a = mvAnim(node, [{ opacity: 1 }, { opacity: 0 }], MOTION.noteMs, { easing: MOTION.easeOut, fill: 'forwards' });
  const kill = () => {
    g.remove();
    MV.ghosts = MV.ghosts.filter(x => x.el !== g);
  };
  if (a) a.addEventListener('finish', kill);
  else kill();
  mvLater(kill, MOTION.noteMs + MOTION.gateMax + 400);
}

// ---------------------------------------------------------------- 알림(토스트)
// 나타날 때 아래에서 살짝 올라오고, 자동으로 사라질 때·다른 알림으로 바뀔 때 내려가며 사라져요
function mvToastIn(el) {
  try {
    if (mvReduce()) return mvAnim(el, [{ opacity: 0 }, { opacity: 1 }], 120, { now: true });
    mvAnim(el, [{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'none' }], MOTION.noteMs, { now: true });
  } catch (e) {
    mvReport('toastIn', e);
  }
}
function mvToastOut(el) {
  if (!el || !el.isConnected || el.classList.contains('mv-gone')) return;
  el.classList.add('mv-gone');
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;
  let done = false;
  const gone = () => {
    if (done) return;
    done = true;
    el.remove();
  };
  try {
    if (mvReduce()) return gone();
    // 자기 효과만 가진 알림이라 전환 정리(mvCancel)와 무관하게 끝까지 내려가요
    const a = el.animate
      ? el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: MOTION.noteMs, easing: MOTION.easeOut, fill: 'forwards' })
      : mvFallback(el, true);
    a.addEventListener('finish', gone);
    a.addEventListener('cancel', gone);
  } catch (e) {
    mvReport('toastOut', e);
    gone();
  }
  setTimeout(gone, MOTION.noteMs + 400);
}

// ---------------------------------------------------------------- hidden 으로 켜고 끄는 칸
// el.hidden = … 대신 mvShow(el, 보일지) 를 쓰면 높이와 흐림이 부드럽게 바뀌어요
function mvShow(el, show) {
  if (!el) return;
  try {
    mvShowImpl(el, show);
  } catch (e) {
    mvReport('mvShow', e);
    el.hidden = !show;
  }
}
function mvShowImpl(el, show) {
  if (el._mvs) el._mvs.cancel();
  el._mvs = null;
  if (show === !el.hidden) return;
  const R = mvReduce();
  if (show) {
    el.hidden = false;
    if (R) return;
    const cs = getComputedStyle(el),
      h = el.offsetHeight;
    if (cs.position === 'absolute' || cs.position === 'fixed' || !h || mvSmall(el, cs)) el._mvs = mvAnim(el, [{ opacity: 0 }, { opacity: 1 }], MOTION.noteMs);
    else el._mvs = mvCollapse(el, cs, h, true);
  } else {
    if (R) {
      el.hidden = true;
      return;
    }
    const cs = getComputedStyle(el),
      h = el.offsetHeight;
    const hide = () => {
      el.hidden = true;
      el._mvs = null;
    };
    if (cs.position === 'absolute' || cs.position === 'fixed' || mvSmall(el, cs)) {
      const a = mvAnim(el, [{ opacity: 1 }, { opacity: 0 }], MOTION.noteMs, { fill: 'forwards' });
      el._mvs = a;
      if (a) {
        a.addEventListener('finish', () => {
          hide();
          a.cancel();
        });
      } else hide();
    } else {
      el._mvs = mvCollapse(el, cs, h, false, () => {
        hide();
        if (el.getAnimations) el.getAnimations().forEach(x => MV.anims.includes(x) || x.cancel());
      });
    }
  }
}

// ---------------------------------------------------------------- 개발용 기록 (dev/motion-check.html 이 읽어요. 앱 화면에는 안 나와요)
function mvLog(t) {
  const kind = t.page ? (t.tab ? 'tab' : 'page') : t.sub ? 'sub' : t.sel ? 'expand' : t.sheet ? 'sheet:' + t.sheet : '';
  if (!kind) return;
  MV.log.push({ kind, dir: t.dir, at: performance.now(), anims: MV.anims.length, gate: MV.gate });
  if (MV.log.length > 30) MV.log.shift();
}
