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
    mode = INTRO_MODE === 'soft' ? (R ? 'soft-r' : 'soft') : R ? 'none' : 'fold3d';
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
  if (document.hidden) introFinish();
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
const MV = { last: null, plan: null, anims: [], ghosts: [], timers: [], live: null, opener: null };
const MV_HOME = ['home', 'prep', 'areas', 'trips'],
  MV_PLAN = ['sched', 'map', 'guide', 'fare'],
  MV_SEG = ['city', 'outer', 'trip', 'wish'];
// 시트 안에서 「다른 내용」으로 보는 값 (검색어·입력값·체크 목록은 넣지 않아요)
const MV_SHEET_ID = ['id', 'uid', 'li', 'ctx', 'k'],
  MV_SHEET_IN = ['cat', 'tab', 'mode', 'i', 'o', 'h', 'm', 'to'];

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
    st.sid = sh.type + '|' + MV_SHEET_ID.map(k => (sh[k] == null ? '' : String(sh[k]))).join('|');
    st.sin = MV_SHEET_IN.map(k => (sh[k] == null ? '' : String(sh[k]))).join('|');
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
function mvAnim(el, frames, ms, opt = {}) {
  if (!el || !el.animate) return null;
  const a = el.animate(frames, { duration: ms, easing: opt.easing || MOTION.ease, fill: opt.fill || 'backwards', delay: opt.delay || 0 });
  MV.anims.push(a);
  const drop = () => {
    const i = MV.anims.indexOf(a);
    if (i >= 0) MV.anims.splice(i, 1);
  };
  a.onfinish = drop;
  a.oncancel = drop;
  return a;
}
function mvLater(fn, ms) {
  const t = setTimeout(() => {
    MV.timers = MV.timers.filter(x => x !== t);
    fn();
  }, ms);
  MV.timers.push(t);
}
// 진행 중인 효과를 모두 정리 (새 전환이 시작될 때 · 동작 줄이기로 바뀔 때)
function mvCancel() {
  MV.anims.slice().forEach(a => a.cancel());
  MV.anims = [];
  MV.ghosts.forEach(g => g.el.remove());
  MV.ghosts = [];
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
const MV_SKIP = '[role=tablist],.days,.ptabs,.h3-seg,.seg,.tabs,.handle,.sh-x,input,select,textarea,.cal-h';
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
  const cur = mvState(),
    t = mvClassify(MV.last, cur);
  MV.t = t;
  MV.next = cur;
  const busy = t.page || t.sub || t.sel || (t.sheet && t.sheet !== 'close');
  if (busy || t.sheet === 'close') mvCancel();
  if (mvReduce()) return; // 동작 줄이기: 기억할 것 없음 (짧게 흐려지기만)
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
    MV.subSig = z ? mvSig(z, 4) : null;
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
    if (t.sheet === 'in') MV.shSig = mvSig(sh, 4);
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
function motionAfter() {
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

  if (t.page) mvPage(t, R);
  else if (MV.live && !t.sub && !t.sheet && now - MV.live.t0 < MV.live.ms) {
    // 전환 도중 데이터가 와서 같은 화면을 다시 그렸으면: 새로 생긴 칸에 남은 만큼 이어서
    const L = MV.live;
    mvZones().forEach(el => mvEnterEl(el, L.dx, L.ms, -(now - L.t0), R));
  }
  if (t.sub) mvSub(t, R);
  if (t.sel) mvSel(prev, cur, R);
  if (t.sheet === 'open') mvSheetOpen(R);
  else if (t.sheet === 'close') mvSheetClose(R);
  else if (t.sheet) mvSheetMove(t, R);
  else if (MV.shLive && cur.sh && now - MV.shLive.t0 < MOTION.sheetMs) {
    // 시트가 올라오는 도중 다시 그려졌으면 이어서 올라오게
    mvSheetOpen(R, -(now - MV.shLive.t0));
  }
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
    mvGhostDrop(g, ms + 400); // 혹시 끝 알림이 없을 때를 위한 안전장치
  }
  mvZones().forEach(el => mvEnterEl(el, dx, ms, R ? 0 : MOTION.inDelay, R));
  MV.live = { t0: performance.now(), ms, dx };
}
// 같은 화면 안 내용 바꾸기: 실제로 바뀐 칸만
function mvSub(t, R) {
  const z = mvSubZone();
  if (!z) return;
  const els = MV.subSig ? mvChanged(MV.subSig, z, 4, []) : [z];
  const dx = R ? 0 : t.dir * MOTION.subShift;
  els.forEach(el =>
    mvAnim(
      el,
      dx ? [{ opacity: 0.2, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }] : [{ opacity: 0.2 }, { opacity: 1 }],
      R ? Math.min(MOTION.subMs, 140) : MOTION.subMs
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
function mvSheetOpen(R, delay = 0) {
  const sh = mvSheet(),
    sc = document.querySelector('#app .scrim');
  if (!sh) return;
  const base = getComputedStyle(sh).transform;
  const b = base && base !== 'none' ? base : '';
  if (sc) mvAnim(sc, [{ opacity: 0 }, { opacity: 1 }], MOTION.sheetMs, { delay, easing: 'linear' });
  mvAnim(
    sh,
    R ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: `${b} translateY(${MOTION.sheetRise}px)`, opacity: 0 }, { transform: b || 'none', opacity: 1 }],
    R ? 140 : MOTION.sheetMs,
    { delay }
  );
  if (!delay) MV.shLive = { t0: performance.now() };
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
  mvGhostDrop(g, MOTION.sheetMs + 400);
}
// 열린 시트 안에서 이동: 틀(배경·위치)은 그대로, 높이는 부드럽게, 내용만 바뀌어요
function mvSheetMove(t, R) {
  const sh = mvSheet();
  if (!sh) return;
  const kids = t.sheet === 'in' && MV.shSig ? mvChanged(MV.shSig, sh, 4, []) : [...sh.children].filter(c => !c.classList.contains('handle'));
  const dx = R ? 0 : t.sheet === 'in' ? t.idir * MOTION.subShift : t.sdir * MOTION.sheetInnerShift;
  const ms = t.sheet === 'in' ? MOTION.subMs : MOTION.sheetInnerMs;
  kids.forEach(el =>
    mvAnim(
      el,
      dx
        ? [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }]
        : [{ opacity: t.sheet === 'in' ? 0.2 : 0, transform: t.sheet === 'swap' && !R ? 'translateY(6px)' : 'none' }, { opacity: 1, transform: 'none' }],
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
    e.preventDefault();
    if (d._mv) d._mv.cancel();
    const h0 = d.offsetHeight,
      opening = !d.open;
    if (opening) d.open = true;
    const h1 = opening ? d.offsetHeight : sm.offsetHeight + (parseFloat(getComputedStyle(d).paddingTop) || 0) + (parseFloat(getComputedStyle(d).paddingBottom) || 0) + (parseFloat(getComputedStyle(d).borderTopWidth) || 0) * 2;
    d.style.overflow = 'hidden';
    const a = d.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: MOTION.expandMs, easing: MOTION.ease });
    d._mv = a;
    const end = ok => {
      d.style.overflow = '';
      d._mv = null;
      if (ok && !opening) d.open = false;
    };
    a.onfinish = () => end(true);
    a.oncancel = () => end(false);
  },
  true
);

// 동작 줄이기로 바뀌면 진행 중인 효과를 모두 정리
if (MQ_REDUCE.addEventListener) MQ_REDUCE.addEventListener('change', () => mvCancel());
