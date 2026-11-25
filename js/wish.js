// ======================================================================
// wish.js · 가고 싶은 곳 · 직접 장소 추가 · 화면 테마(라이트/다크)
// - 동네 시트·장소 시트의 ☆를 누르면 「가고 싶은 곳」에 모여요 (이 기기에 저장)
// - 동네 탭 「직접 장소 추가」: 구글 지도 주소(○丁目)·좌표를 붙여 넣고 이름을 정해 추가
// - 계획 화면 「가고 싶은 곳」 칸(보류함 위)에서 골라 그날 일정에 넣어요
// - 홈 오른쪽 위 해/달 버튼으로 라이트·다크를 직접 골라요 (고른 값은 이 기기에 저장)
// ======================================================================

// ---- 테마 ----
function themeNow() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function themeApply(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    m.setAttribute('content', t === 'dark' ? '#0E1424' : '#F7F3ED');
    m.removeAttribute('media');
  });
}
(() => {
  const t = lsGet('fk-theme', null);
  if (t === 'dark' || t === 'light') themeApply(t);
})();
function themeBtn() {
  const t = themeNow(),
    b = (k, i, l) =>
      `<button class="${t === k ? 'on' : ''}" data-act="setTheme" data-t="${k}" aria-pressed="${t === k}" aria-label="${l}">${ic(i)}</button>`;
  return `<span class="th-tg" role="group" aria-label="${L('화면 테마', '画面テーマ')}">${b('light', 'sun', L('라이트 모드', 'ライトモード'))}${b('dark', 'moon', L('다크 모드', 'ダークモード'))}</span>`;
}

// ---- 가고 싶은 곳 (이 기기에 저장) ----
// 칸: { k: 's', id: 장소id } 또는 { k: 'c', id, n: 이름, addr: 주소, lat, lng, z }
const WISH_KEY = 'fk-wish';
function wishAll() {
  const v = lsGet(WISH_KEY, []);
  return (Array.isArray(v) ? v : []).filter(
    w => w && (w.k === 'c' ? isFinite(w.lat) && isFinite(w.lng) : w.k === 'a' ? AREA[w.id] : SPOT[w.id])
  );
}
function wishSave(list) {
  lsSet(WISH_KEY, list);
}
function wishHas(sid) {
  return wishAll().some(w => w.k === 's' && w.id === sid);
}
function wishStar(s, cls = 'wl-star') {
  const on = wishHas(s.id),
    nm = LANG === 'ja' ? s.j : s.n;
  return `<button class="${cls}${on ? ' on' : ''}" data-act="wishTog" data-id="${s.id}" aria-pressed="${on}" aria-label="${esc(
    on ? L(`${nm} 가고 싶은 곳에서 빼기`, `${nm}を行きたい所から外す`) : L(`${nm} 가고 싶은 곳에 추가`, `${nm}を行きたい所に追加`)
  )}">${ic('star')}</button>`;
}
function wishName(w) {
  if (w.k === 'a') return L(AREA[w.id].n, AREA_JA[w.id] || AREA[w.id].n);
  return w.k === 'c' ? w.n : LANG === 'ja' ? SPOT[w.id].j : SPOT[w.id].n;
}
function wishSub(w) {
  if (w.k === 'c') return w.addr || `${w.lat}, ${w.lng}`;
  if (w.k === 'a') return `${L('동네', 'エリア')} · ${AREA[w.id].sub}`;
  const s = SPOT[w.id];
  return `${L(AREA[s.a].n, AREA_JA[s.a] || AREA[s.a].n)} · ${dur(s.s)}`;
}

// 동네 탭 「가고 싶은 곳」 목록
function wishTabV() {
  const list = wishAll();
  if (!list.length)
    return `<div class="h3-none wl-empty">${ic('star')}<p>${L(
      '아직 모은 곳이 없어요.<br>시내·근교·당일치기에서 동네를 눌러 「가고 싶은 곳에 추가」나 장소 옆 ☆를 누르거나,<br>위의 「직접 장소 추가」로 모아 보세요.',
      'まだありません。<br>市内・近郊・日帰りでエリアを開いて☆を押すか、<br>上の「場所を追加」で集めてください。'
    )}</p></div>`;
  return `<ul class="wl-list">${list
    .map(w => {
      if (w.k === 'a') return wishAreaRow(w);
      if (w.k === 's') {
        const s = SPOT[w.id];
        return `<li class="wl-row"><button class="ar-tc" data-act="spotSheet" data-id="${s.id}">${catTile(s.c)}<span class="ar-tt"><b>${esc(wishName(w))}</b><small>${esc(wishSub(w))}</small></span></button>${wishStar(s)}</li>`;
      }
      return `<li class="wl-row"><div class="ar-tc wl-c"><span class="ct wl-pin">${ic('pin')}</span><span class="ar-tt"><b>${esc(w.n)}</b><small lang="ja">${esc(wishSub(w))}</small></span></div><button class="wl-star wl-del" data-act="wishDel" data-id="${w.id}" aria-label="${esc(L(`${w.n} 삭제`, `${w.n}を削除`))}">${ic('trash')}</button></li>`;
    })
    .join('')}</ul>
    <p class="ar-tip">${L('계획 화면의 「가고 싶은 곳」에서 골라 일정에 넣을 수 있어요', '計画画面の「行きたい所」から選んで予定に入れられます')}</p>`;
}

// 시트: 직접 장소 추가
function waddSheetV(sh) {
  return (
    shHead(
      L('직접 장소 추가', '場所を追加'),
      L('구글 지도에서 복사한 주소를 붙여 넣고 이름을 정해요.', 'Googleマップでコピーした住所を貼り付けて、名前を付けます。')
    ) +
    `<div class="wadd">
      <label class="fld"><span>${L('이름', '名前')}</span><input id="wName" maxlength="30" autocomplete="off" value="${esc(sh.n || '')}" placeholder="${esc(L('예: 친구가 추천한 카페', '例: 友だちおすすめのカフェ'))}"></label>
      <label class="fld"><span>${L('주소', '住所')}</span><textarea id="wAddr" rows="3" autocomplete="off" placeholder="${esc(L('예: 福岡県福岡市中央区天神2丁目5-35', '例: 福岡県福岡市中央区天神2丁目5-35'))}">${esc(sh.addr || '')}</textarea></label>
      <p class="wh-hint">${ic('pin')}<span>${L('구글 지도에서 장소를 누르고 주소를 길게 눌러 복사해요. 좌표(33.5905, 130.3976)나 구글 지도 링크도 돼요.', 'Googleマップで場所を開き、住所を長押ししてコピーします。座標(33.5905, 130.3976)やGoogleマップのリンクでもOKです。')}</span></p>
    </div>
    <div class="sh-foot"><button class="btn soft" data-act="closeSheet">${L('취소', 'キャンセル')}</button><button class="btn pri" data-act="wAddSave"${sh.busy ? ' disabled' : ''}>${sh.busy ? L('위치 찾는 중…', '場所を検索中…') : `${ic('plus')}${L('추가', '追加')}`}</button></div>`
  );
}
SHEETS.wadd = waddSheetV;
SHEET_LABEL.wadd = '직접 장소 추가';

// 주소 → 좌표. 국토지리원 주소 검색(일본 주소에 강해요) → 안 되면 OpenStreetMap
function wNorm(t) {
  return String(t || '')
    .normalize('NFKC')
    .replace(/^\s*(日本|일본|Japan)\s*[、,]?\s*/i, '')
    .replace(/〒?\s*\d{3}-\d{4}\s*/, '')
    .replace(/[−–—ー‐](?=\d)/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
const wIn = (lat, lng) => lat > 30.9 && lat < 34.6 && lng > 129.3 && lng < 132.2;
async function wGsi(q) {
  const r = await fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('http ' + r.status);
  const js = await r.json(),
    key = q.replace(/\s/g, '');
  const pre = t => {
    let i = 0;
    while (i < t.length && i < key.length && t[i] === key[i]) i++;
    return i;
  };
  let best = null;
  (Array.isArray(js) ? js : []).forEach(x => {
    const c = x && x.geometry && x.geometry.coordinates,
      t = ((x && x.properties && x.properties.title) || '').replace(/\s/g, '');
    if (!c || !wIn(+c[1], +c[0])) return;
    const sc = pre(t) || pre(t.replace(/^福岡県/, '')) || 1;
    if (!best || sc > best.sc) best = { sc, lat: +c[1], lng: +c[0] };
  });
  return best;
}
async function wOsm(q) {
  const r = await fetch(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&bounded=1&viewbox=129.3,34.6,132.2,30.9&accept-language=ja&q=' +
      encodeURIComponent(q),
    { headers: { Accept: 'application/json' } }
  );
  if (!r.ok) throw new Error('http ' + r.status);
  const js = await r.json(),
    x = (Array.isArray(js) ? js : []).find(y => wIn(+y.lat, +y.lon));
  return x ? { lat: +x.lat, lng: +x.lon } : null;
}
async function wGeocode(text) {
  const g = parseLatLng(text);
  if (g && g.far) return { err: 'far' };
  if (g) return g;
  const q = wNorm(text);
  if (!q) return null;
  const tries = [() => wGsi(q), () => wOsm(q)],
    short = q.replace(/(丁目|番地?|号)?[\d\-]+(号)?\s*[^\d]*$/, '$1');
  if (short && short !== q) tries.push(() => wGsi(short));
  let netErr = false;
  for (const f of tries) {
    try {
      const r = await f();
      if (r) return r;
    } catch (e) {
      netErr = true;
    }
  }
  return netErr ? { err: 'net' } : null;
}

// 계획 화면: 보류함 위 「가고 싶은 곳」 칸 (이 계획에 아직 안 넣은 곳만)
function wishLeft(p) {
  const sids = new Set(),
    wids = new Set();
  p.days.forEach(d =>
    d.items.forEach(it => {
      if (it.sid) sids.add(it.sid);
      if (it.wid) wids.add(it.wid);
    })
  );
  return wishAll().filter(w => w.k !== 'a' && (w.k === 's' ? !sids.has(w.id) : !wids.has(w.id)));
}
function wishPlanV(p) {
  const all = wishAll().filter(w => w.k !== 'a');
  if (!all.length) return '';
  const left = wishLeft(p);
  return `<details class="card wishbox"${S.openWish ? ' open' : ''}><summary>${ic('star')}<b>${L('가고 싶은 곳', '行きたい所')}</b><span class="cnt">${left.length}</span>${ic('down', 'chev')}</summary>
    <p class="sub">${left.length ? L('동네 탭에서 모은 곳이에요. 원하는 날에 넣을 수 있어요.', 'エリアタブで集めた場所です。好きな日に入れられます。') : L('모은 곳을 모두 일정에 넣었어요.', '集めた場所はすべて予定に入れました。')}</p>
    ${left.length ? `<ul>${left.map(w => `<li><span class="pk-t"><b>${esc(wishName(w))}</b><small${w.k === 'c' ? ' lang="ja"' : ''}>${esc(wishSub(w))}</small></span><button class="btn soft sm" data-act="wishIn" data-id="${w.id}">${L(`${S.di + 1}일차에 넣기`, `${S.di + 1}日目に入れる`)}</button></li>`).join('')}</ul>` : ''}
  </details>`;
}
// 가고 싶은 곳 → 일정 칸
function wishItem(w) {
  if (w.k === 's') return mkItem(w.id, 'user');
  return { uid: uid(), n: w.n, stay: 60, src: 'user', custom: true, wid: w.id, lat: w.lat, lng: w.lng, z: w.z || nearestArea(w).z, wh: 'pin' };
}
function doWishIn(w, di) {
  const p = S.plan;
  pushUndo();
  const it = wishItem(w);
  if (it.sid) p.parked = p.parked.filter(x => x.sid !== it.sid);
  const b = insertSlot(p, di, it);
  S.di = di;
  S.openWish = true;
  S.sheet = null;
  dirty();
  render();
  toast(slotToast(p, di, it, b), true);
}
// 시트: 이 날엔 시간이 안 맞아요 → 다른 날 고르기 (보류함과 같은 방식)
function wishDaySheetV(sh) {
  const p = S.plan,
    w = p && wishAll().find(x => x.id === sh.id);
  if (!w) return shHead(L('가고 싶은 곳', '行きたい所'), '');
  const it = wishItem(w),
    here = bestSlot(p, S.di, it),
    others = slotOtherDays(p, it, S.di),
    name = esc(wishName(w));
  const list = others.length
    ? `<h3 class="sec"><span>${L('시간이 맞는 날', '時間が合う日')}</span></h3><ul class="up-days">${others
        .map(
          o =>
            `<li><button class="up-day" data-act="wishTo" data-id="${w.id}" data-di="${o.j}"><b>${L(`${o.j + 1}일차`, `${o.j + 1}日目`)}</b><span>${mds(p.days[o.j].date)}</span><small>${L(`${fmt(o.b.arr)} 도착 · ${o.b.k + 1}번째`, `${fmt(o.b.arr)}着 · ${o.b.k + 1}番目`)}</small>${ic('next', 'chev')}</button></li>`
        )
        .join('')}</ul>`
    : `<p class="note">${ic('clock')}<span>${L('어느 날에도 문 여는 시간 안에 넣을 자리가 없어요. 그날 다른 장소를 빼거나 하루 마무리 시간을 늦춰 보세요.', 'どの日も営業時間内に入れられる場所がありません。その日のほかの場所を外すか、1日の終了時間を遅らせてみてください。')}</span></p>`;
  return (
    shHead(L(`${name} 넣기`, `${name}を入れる`), L(`${S.di + 1}일차엔 시간이 안 맞아요.`, `${S.di + 1}日目は時間が合いません。`)) +
    `<p class="note warn">${ic('alert')}<span>${esc(slotWhyT(p, S.di, it, here))}</span></p>` +
    list +
    `<div class="sh-foot col"><button class="btn soft" data-act="wishTo" data-id="${w.id}" data-di="${S.di}">${L(`그래도 ${S.di + 1}일차에 넣기`, `それでも${S.di + 1}日目に入れる`)}</button><button class="btn soft" data-act="closeSheet">${L('그대로 두기', 'そのままにする')}</button></div>`
  );
}
SHEETS.wishday = wishDaySheetV;
SHEET_LABEL.wishday = '가고 싶은 곳';

Object.assign(A, {
  setTheme(d) {
    const t = d.t === 'dark' ? 'dark' : 'light';
    lsSet('fk-theme', t);
    themeApply(t);
    render();
  },
  wishTog(d) {
    const s = SPOT[d.id];
    if (!s) return;
    let list = wishAll();
    const on = list.some(w => w.k === 's' && w.id === d.id);
    list = on ? list.filter(w => !(w.k === 's' && w.id === d.id)) : [{ k: 's', id: d.id }, ...list];
    wishSave(list);
    S.keepSheetScroll = true;
    render();
    const nm = LANG === 'ja' ? s.j : s.n;
    toast(on ? L(`${nm}을(를) 가고 싶은 곳에서 뺐어요`, `「${nm}」を行きたい所から外しました`) : L(`${nm}을(를) 가고 싶은 곳에 넣었어요`, `「${nm}」を行きたい所に追加しました`));
  },
  wishArea(d) {
    if (!AREA[d.id]) return;
    let list = wishAll();
    const on = list.some(w => w.k === 'a' && w.id === d.id);
    list = on ? list.filter(w => !(w.k === 'a' && w.id === d.id)) : [{ k: 'a', id: d.id }, ...list];
    wishSave(list);
    S.keepSheetScroll = true;
    render();
    const nm = L(AREA[d.id].n, AREA_JA[d.id] || AREA[d.id].n);
    toast(on ? L(`${nm}을(를) 가고 싶은 곳에서 뺐어요`, `「${nm}」を行きたい所から外しました`) : L(`${nm}을(를) 가고 싶은 곳에 넣었어요`, `「${nm}」を行きたい所に追加しました`));
  },
  wishDel(d) {
    const w = wishAll().find(x => x.id === d.id);
    wishSave(wishAll().filter(x => x.id !== d.id));
    render();
    if (w) toast(L(`${w.n}을(를) 가고 싶은 곳에서 지웠어요`, `「${w.n}」を行きたい所から削除しました`));
  },
  wAddOpen() {
    S.sheet = { type: 'wadd', n: '', addr: '' };
    render();
    const el = document.getElementById('wName');
    if (el) el.focus();
  },
  async wAddSave() {
    const sh = S.sheet;
    if (!sh || sh.type !== 'wadd' || sh.busy) return;
    const nEl = document.getElementById('wName'),
      aEl = document.getElementById('wAddr');
    sh.n = (nEl.value || '').trim();
    sh.addr = (aEl.value || '').trim();
    if (!sh.n) {
      nEl.focus();
      toast(L('이름을 적어 주세요.', '名前を入力してください。'));
      return;
    }
    if (!sh.addr) {
      aEl.focus();
      toast(L('주소를 붙여 넣어 주세요.', '住所を貼り付けてください。'));
      return;
    }
    sh.busy = true;
    S.keepSheetScroll = true;
    render();
    const g = await wGeocode(sh.addr);
    if (S.sheet !== sh) return;
    sh.busy = false;
    if (!g || g.err) {
      S.keepSheetScroll = true;
      render();
      toast(
        g && g.err === 'far'
          ? L('후쿠오카에서 너무 먼 곳이에요. 주소를 다시 확인해 주세요.', '福岡から遠すぎる場所です。住所を確認してください。')
          : g && g.err === 'net'
            ? L('인터넷에 연결되지 않아 주소를 찾지 못했어요. 좌표(33.5905, 130.3976)를 붙여 넣어 보세요.', 'ネットにつながらず住所を検索できませんでした。座標(33.5905, 130.3976)を貼り付けてみてください。')
            : L('주소로 위치를 못 찾았어요. 「○丁目」까지 있는 주소나 좌표를 붙여 넣어 주세요.', '住所から場所が見つかりませんでした。「○丁目」までの住所か座標を貼り付けてください。')
      );
      return;
    }
    const pt = { lat: +(+g.lat).toFixed(6), lng: +(+g.lng).toFixed(6) },
      w = { k: 'c', id: 'w' + uid(), n: sh.n, addr: parseLatLng(sh.addr) ? '' : wNorm(sh.addr), ...pt, z: nearestArea(pt).z };
    wishSave([w, ...wishAll()]);
    S.sheet = null;
    if (S.view === 'home') S.aseg = 'wish';
    render();
    toast(L(`${w.n}을(를) 가고 싶은 곳에 넣었어요`, `「${w.n}」を行きたい所に追加しました`));
  },
  wishIn(d) {
    const p = S.plan,
      w = wishAll().find(x => x.id === d.id);
    if (!p || !w) return;
    const b = bestSlot(p, S.di, wishItem(w));
    if (b.ok) doWishIn(w, S.di);
    else {
      S.sheet = { type: 'wishday', id: w.id };
      render();
    }
  },
  wishTo(d) {
    const w = wishAll().find(x => x.id === d.id);
    if (w) doWishIn(w, Number(d.di));
  }
});

// ---- 동네 단위로 가고 싶은 곳 (동네 시트 아래 버튼) ----
function wishAreaHas(id) {
  return wishAll().some(w => w.k === 'a' && w.id === id);
}
function wishAreaBtn(id) {
  const on = wishAreaHas(id);
  return `<button class="btn pri wl-btn${on ? ' on' : ''}" data-act="wishArea" data-id="${id}" aria-pressed="${on}">${ic('star')}${on ? L('가고 싶은 곳에서 빼기', '行きたい所から外す') : L('가고 싶은 곳에 추가', '行きたい所に追加')}</button>`;
}
function wishSpotBtn(id) {
  const on = wishHas(id);
  return `<button class="btn pri wl-btn${on ? ' on' : ''}" data-act="wishTog" data-id="${id}" aria-pressed="${on}">${ic('star')}${on ? L('가고 싶은 곳에서 빼기', '行きたい所から外す') : L('가고 싶은 곳에 추가', '行きたい所に追加')}</button>`;
}
function wishAreaRow(w) {
  const a = AREA[w.id],
    [c1] = AREA_TONE[a.id] || ['#F0703A'];
  return `<li class="wl-row"><button class="ar-tc" data-act="areaSheet" data-id="${a.id}"><span class="ct" style="--c:${c1}">${ic('map')}</span><span class="ar-tt"><b>${esc(wishName(w))}</b><small>${esc(wishSub(w))}</small></span></button><button class="wl-star on" data-act="wishArea" data-id="${a.id}" aria-pressed="true" aria-label="${esc(L(`${a.n} 가고 싶은 곳에서 빼기`, `${AREA_JA[a.id] || a.n}を行きたい所から外す`))}">${ic('star')}</button></li>`;
}

// ---- 새 여행 2단계: 시내·근교·당일치기 아래 「가고 싶은 곳」 + 지도 별 핀 ----
// 지도에 찍을 점 (장소·직접 추가한 곳). svgOnly: 지도 밖(당일치기 동네) 장소는 빼요
function wishPts(svgOnly) {
  return wishAll()
    .filter(w => w.k !== 'a')
    .map(w => {
      if (w.k === 'c') return { id: w.id, k: 'c', n: w.n, lat: w.lat, lng: w.lng };
      const s = SPOT[w.id];
      if (svgOnly && AREA[s.a].kind === 'trip') return null;
      return { id: s.id, k: 's', n: LANG === 'ja' ? s.j : s.n, lat: s.lat, lng: s.lng };
    })
    .filter(Boolean);
}
const WISH_STAR = 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z';
function wishPinSVG(it, k) {
  const w = it.wp,
    t = it.at,
    act = w.k === 's' ? ` data-act="spotSheet" data-id="${w.id}" tabindex="0" role="button" aria-label="${esc(w.n)}"` : ' aria-hidden="true"';
  return `<g class="wpin"${act} transform="translate(${f1(it.x)},${f1(it.y)}) scale(${f1(k)})"><circle r="16" class="wpin-hit"/><circle r="10" class="wpin-c"/><path class="wpin-s" transform="translate(-6.6,-6.4) scale(.55)" d="${WISH_STAR}"/>${t ? `<text class="wpin-t" x="${f1((t.tx - it.x) / k)}" y="${f1((t.ty - it.y) / k)}" style="text-anchor:${t.ax}">${esc(w.n)}</text>` : ''}</g>`;
}
function wishDraftV() {
  const list = wishAll(),
    areas = list.filter(w => w.k === 'a'),
    rest = list.filter(w => w.k !== 'a');
  const row = w => {
    if (w.k === 's') {
      const s = SPOT[w.id];
      return `<li class="wl-row"><button class="ar-tc" data-act="wishTog" data-id="${s.id}" aria-label="${esc(L(`${wishName(w)} 가고 싶은 곳에서 빼기`, `${wishName(w)}を行きたい所から外す`))}">${catTile(s.c)}<span class="ar-tt"><b>${esc(wishName(w))}</b><small>${esc(wishSub(w))}</small></span></button>${wishStar(s)}</li>`;
    }
    return `<li class="wl-row"><button class="ar-tc wl-c" data-act="wishDel" data-id="${w.id}" aria-label="${esc(L(`${w.n} 삭제`, `${w.n}を削除`))}"><span class="ct wl-pin">${ic('pin')}</span><span class="ar-tt"><b>${esc(w.n)}</b><small lang="ja">${esc(wishSub(w))}</small></span></button><button class="wl-star wl-del" data-act="wishDel" data-id="${w.id}" aria-label="${esc(L(`${w.n} 삭제`, `${w.n}を削除`))}">${ic('trash')}</button></li>`;
  };
  return `<h2 class="sec wl-sec"><span>${ic('star')}${L('가고 싶은 곳', '行きたい所')}</span><button class="wl-add" data-act="wAddOpen">${ic('plus')}${L('직접 장소 추가', '場所を追加')}</button></h2>
    ${
      list.length
        ? `${areas.length ? `<div class="agrid">${areas.map(w => areaCard(AREA[w.id])).join('')}</div>` : ''}
    ${rest.length ? `<ul class="wl-list wl-draft">${rest.map(row).join('')}</ul>` : ''}
    <p class="wl-note">${L('누르면 가고 싶은 곳에서 빠져요. ☆ 장소는 지도에 별로 보여요.', 'タップすると行きたい所から外れます。☆の場所は地図に星で表示されます。')}</p>`
        : `<p class="wl-note">${L('동네 탭에서 ☆로 모으거나 「직접 장소 추가」로 넣은 곳이 여기에 보여요.', 'エリアタブの☆や「場所を追加」で集めた場所がここに表示されます。')}</p>`
    }`;
}

// ---- 새 여행: 자동으로 짤지, 직접 짤지 ----
function pmodeSheetV() {
  return (
    shHead(L('어떻게 계획을 세울까요?', 'どうやって計画を立てますか?'), L('날짜와 가고 싶은 곳을 고른 다음 단계가 달라져요.', '日付と行きたい所を選んだ後が変わります。')) +
    `<div class="pm-grid">
      <button class="pm-opt" data-act="newPlanGo" data-m="auto"><span class="pm-c">${ic('spark')}</span><b>${L('계획을 자동으로 짜 주세요', '計画を自動で作って')}</b><small>${L('1일차~마지막 날까지 동선·시간을 알아서 짜 드려요', '1日目から最終日まで、ルートと時間を自動で組みます')}</small></button>
      <button class="pm-opt" data-act="newPlanGo" data-m="manual"><span class="pm-c">${ic('pen')}</span><b>${L('직접 계획을 세울게요', '自分で計画を立てます')}</b><small>${L('빈 일정표만 만들고, 장소는 직접 넣어요', '空の予定表だけ作り、場所は自分で入れます')}</small></button>
    </div>`
  );
}
SHEETS.pmode = pmodeSheetV;
SHEET_LABEL.pmode = '계획 방식';
// 직접 계획: 날짜·숙소 틀만 만들고 장소는 넣지 않아요 (숙소 짐 맡기기 같은 고정 칸은 그대로)
function createPlanManual(set, areaIds) {
  const p = createPlan(set, []);
  p.areas = areaIds.slice();
  p.manual = true;
  p.days.forEach((d, i) => {
    d.items = d.items.filter(it => it.fixed || it.move);
    d.areas = [];
    cleanModes(p, i);
  });
  return p;
}
// 자동 계획: 고른 동네(없으면 가고 싶은 곳에 담은 동네)로 짜고, 담아 둔 장소·직접 추가한 곳도 가장 잘 맞는 날에 넣어요
function createPlanWish(set, areaIds) {
  const list = wishAll(),
    ids = areaIds.length ? areaIds : list.filter(w => w.k === 'a').map(w => w.id);
  const p = createPlan(set, ids);
  wishLeft(p).forEach(w => {
    const it = wishItem(w);
    if (it.sid) p.parked = p.parked.filter(x => x.sid !== it.sid);
    const best = p.days
      .map((d, j) => ({ j, b: bestSlot(p, j, it) }))
      .sort((x, y) => (y.b.ok - x.b.ok) || x.b.score - y.b.score)[0];
    if (best) insertSlot(p, best.j, it);
  });
  return p;
}
// 「가고 싶은 곳」 칸을 열고 닫은 상태 기억
$app.addEventListener(
  'toggle',
  e => {
    if (e.target.classList && e.target.classList.contains('wishbox')) S.openWish = e.target.open;
  },
  true
);
