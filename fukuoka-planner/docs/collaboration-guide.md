# 후쿠오카 여행 플래너 · 협업 가이드

하나였던 `index.html`을 역할별 파일로 나눈 뒤의 실행 방법, 담당 파일, GitHub 협업 순서를 정리했어요.
새 프레임워크나 빌드 도구는 없어요. 예전처럼 **HTML + CSS + 일반 JavaScript** 그대로예요.

---

## 1. 폴더 구조

```
index.html              화면 뼈대(<div id="app">), CSS·JS 연결 (순서 중요!)
css/
  style.css             모든 스타일 (원래 <style> 안의 내용을 순서 그대로)
js/
  config.js             IS_APP 설정 (가장 먼저)
  data.js               동네·장소·역·노선·요금·지도 모양 데이터
  spot_info.js          장소 상세 설명(한·일), 팁, 입장료
  engine.js             일정 만들기, 하루 계산, 이동 방법, 교통비·패스, 다시 짜기
  i18n.js               한국어·일본어 전환, 번역 사전(const JA)
  ui.js                 공통 상태(S), 동작 목록(A), render(), 저장(store), 새 여행 1·2단계, 일정·지도·교통비 탭, 이벤트 연결
  home.js               홈 화면, 여행 준비 시트, 시트 목록(SHEETS), L() 함수, 계획 공유·가져오기, 장소 정보
  stays.js              날짜별 숙소, 숙소 위치 고르기(지도·검색), MapLibre 불러오기
  alt.js                근처 다른 식당
  parked.js             보류함에서 다시 넣기
  custom.js             직접 일정 넣기 + 위치 정하기
  drag.js               일정 끌어서 순서 바꾸기
  nav.js                휴대폰 뒤로가기
  guide.js              길안내 탭, 일본어로 보여주기 카드
  here.js               지금 위치(GPS)에서 길찾기
  live.js               현재 시각에 맞춰 남은 일정 조정
  maps.js               지역 지도, 일정 지도, 걷기 추천 지도
  bootstrap.js          모든 파일이 준비된 뒤 첫 실행 (가장 마지막)
docs/
  collaboration-guide.md  이 문서
```

> 원래 README.md 는 받지 못해서 새로 만들거나 바꾸지 않았어요. 저장소에 README.md 가 있다면 그대로 두면 돼요.

---

## 2. 실행 방법 (Windows + VS Code)

### 방법 A: VS Code「Live Server」(추천)
1. VS Code 왼쪽의 확장(네모 4개 아이콘)에서 **Live Server**(Ritwick Dey)를 설치해요.
2. 저장소 폴더를 VS Code로 열어요 (`파일 → 폴더 열기`).
3. `index.html`을 오른쪽 클릭 → **Open with Live Server**를 눌러요.
4. 브라우저에 `http://127.0.0.1:5500/index.html`이 열려요. 파일을 저장하면 자동으로 새로고침돼요.

### 방법 B: 파이썬이 있으면
VS Code 터미널(`` Ctrl+` ``)에서 이렇게 입력해요.
```
python -m http.server 8000
```
그리고 브라우저에서 `http://localhost:8000` 으로 열어요. 끌 때는 터미널에서 `Ctrl+C` 를 눌러요.

### 참고
- `index.html`을 더블클릭해서 바로 열어도 화면은 떠요. 그래도 실제 배포(GitHub Pages)와 같은 조건에서 보려면 A나 B로 확인하세요.
- 지도(MapLibre·OpenFreeMap), 글꼴(Google Fonts), 숙소 검색(Nominatim)은 인터넷이 있어야 해요. 인터넷이 없으면 원래처럼 간단한 안내 지도로 바뀌어요.

---

## 3. 꼭 지켜야 할 규칙 (모두 읽어 주세요)

### 3-1. 파일 불러오는 순서
`index.html` 아래쪽 `<script>` 순서는 **절대 마음대로 바꾸지 마세요.**

```
config → data → spot_info → engine → i18n → ui → home → stays → alt → parked
→ custom → drag → nav → guide → here → live → maps → bootstrap
```

- 모든 파일은 `type="module"` 없이 **일반 스크립트**예요. 그래서 한 파일에서 만든 `const`·`function` 이름을 다른 파일이 그대로 써요.
- 파일을 **불러오는 순간 실행되는 코드**(함수 밖의 코드)는 **앞 파일**에 있는 이름만 쓸 수 있어요.
  예: `stays.js` 맨 바깥에서 `SHEETS.hpick = …` 를 쓸 수 있는 건 `SHEETS`가 앞의 `home.js`에 있어서예요.
- 함수 **안**에서는 어느 파일의 이름이든 써도 돼요. 함수는 모든 파일을 불러온 뒤 실행되니까요.
- `type="module"` 을 붙이거나 파일 전체를 `(function(){ … })()` 로 감싸면 다른 파일이 이름을 못 찾아서 앱이 멈춰요.

### 3-2. 새 JS 파일을 추가할 때
1. `js/새파일.js` 를 만들어요.
2. `index.html` 에서 **`maps.js` 다음, `bootstrap.js` 앞**에 `<script src="js/새파일.js"></script>` 를 넣어요.
3. 다른 파일과 **같은 이름**(`const 이름`, `function 이름`)을 만들지 않았는지 VS Code 검색(`Ctrl+Shift+F`)으로 확인해요.
   `const`·`let` 이름이 겹치면 그 파일 전체가 실행되지 않아 앱이 멈추고, `function` 이름이 겹치면 뒤 파일의 것이 앞 파일의 것을 조용히 덮어써요.

### 3-3. 공통 객체: 새로 만들지 말고 "더하기"만
| 이름 | 있는 곳 | 하는 일 | 규칙 |
|---|---|---|---|
| `S` | ui.js | 앱 상태(지금 화면, 계획, 열린 시트…) | 다른 파일에서 `const S = …` 다시 만들기 금지 |
| `A` | ui.js | 버튼 `data-act="이름"` → `A.이름()` 실행 | `Object.assign(A, { 새이름() {…} })` 로 **추가만**. 이미 있는 이름을 또 쓰면 원래 동작이 덮여요 |
| `SHEETS`, `SHEET_LABEL` | home.js | 시트 종류 → 그리는 함수 / 이름 | `SHEETS.새종류 = 함수` 로 추가. 기존 종류 이름 재사용 금지 |
| `store` | ui.js | 저장·불러오기 | 저장 형식 바꾸지 않기 (아래 4번) |
| `L('한국어','日本語')` | home.js | 새 글자를 두 언어로 | 새 문구는 이걸로 쓰면 번역 사전 안 고쳐도 돼요 |

- 버튼은 HTML에 `data-act="이름"` 만 달면 `ui.js` 의 이벤트 위임이 `A.이름()` 을 불러요. `id`, 클래스, `data-act`, `data-id`/`data-uid` 이름을 바꾸면 그걸 쓰는 CSS·JS가 같이 깨져요.
- 지금 `A`·`SHEETS`·`SHEET_LABEL` 에 겹치는 이름은 하나도 없어요(자동 검사로 확인). 계속 이렇게 유지해 주세요.

### 3-4. CSS
- `css/style.css` 는 원래 순서 그대로예요. 뒤쪽 규칙이 앞쪽을 덮는 곳이 많아서 **정렬하거나 합치면 화면이 달라져요.**
- 새 스타일은 **파일 맨 끝**에 주석과 함께 추가하는 걸 원칙으로 해요.

### 3-5. 첫 실행은 bootstrap.js 에서만
`applyLang() → startTr() → render() → store.init()` 다음에 공유 링크(`#share=`) 확인을 해요.
다른 파일에 `render()` 같은 첫 실행 코드를 새로 넣지 마세요.
`hashchange` 감시는 `home.js` 에 한 번만 등록돼 있어요. 또 등록하면 공유 시트가 두 번 떠요.

---

## 4. 저장 데이터와 공유 형식 (바꾸면 안 돼요)

| 종류 | 값 |
|---|---|
| 계획 저장 키 | `fukuoka-planner-v1` (ui.js `LS_KEY`) |
| 설정 키 | `fk-lang`, `fk-rate`, `fk-hint-off`, `fk-face`, `fk-hero-last` |
| 공유 코드 | `FKP1:` (그대로), `FKZ1.` (압축) |
| 공유 링크 | `주소#share=코드` |

- 키 이름이나 계획 모양을 바꾸면 사용자가 저장한 여행과 보낸 링크가 안 열려요.
- `ui.js` 의 `store` 는 Claude 안에서 열릴 때만 `claude.use('db')`, `claude.use('user')` 를 써요. 일반 브라우저에서는 `claude` 가 없어서 자동으로 localStorage 를 써요. API 키나 서버는 필요 없어요.

---

## 5. 세 사람 담당

### A · 화면과 디자인
| 이런 걸 바꿀 때 | 고칠 파일 |
|---|---|
| 색, 글꼴, 간격, 버튼 모양, 다크 모드, 화면 크기별 모양 | `css/style.css` (끝에 추가) |
| 홈 화면, 여행 준비(공항→시내, 교통 패스, 타는 법, 여행 일본어) 시트 | `js/home.js` |
| 일본어 번역 문구 | `js/i18n.js` 의 `JA` 사전, 또는 새 문구에 `L()` |
| 새 여행 1·2단계 화면 모양, 일정·지도·교통비 탭 모양 | `js/ui.js` ⚠ B와 조율 |
| 앱 이름·아이콘·사진 | `index.html` 머리 부분, `icons/`, `photos/` |

### B · 일정 계산과 편집
| 이런 걸 바꿀 때 | 고칠 파일 |
|---|---|
| 일정 자동 생성 규칙, 하루 시간 계산, 이동 방법·시간, 교통비·패스·환율 계산, 다시 짜기 | `js/engine.js` |
| 머무는 시간, 순서 버튼, 삭제, 보류 | `js/ui.js` (일정 탭·동작 `A`) ⚠ A와 조율 |
| 보류함에서 다시 넣기 | `js/parked.js` |
| 직접 일정 넣기 | `js/custom.js` |
| 끌어서 순서 바꾸기 | `js/drag.js` |
| 지금 시각에 맞춰 조정 | `js/live.js` |
| 근처 다른 식당 | `js/alt.js` |
| 날짜별 숙소 규칙(몇 박, 바꾸기) | `js/stays.js` 의 숙소 칸·시트 부분 ⚠ C와 조율 |

### C · 장소 데이터, 지도, 길안내
| 이런 걸 바꿀 때 | 고칠 파일 |
|---|---|
| 맛집·명소 추가/삭제, 영업시간, 휴무, 요금표, 역·노선 | `js/data.js` |
| 장소 상세 설명·팁·입장료 | `js/spot_info.js` |
| 지역 지도, 일정 지도, 걷기 지도 | `js/maps.js` |
| 숙소 위치 고르기 지도·검색, MapLibre 불러오기 | `js/stays.js` 의 `hp…` 함수들 ⚠ B와 조율 |
| 길안내 탭, 일본어로 보여주기 카드 | `js/guide.js` |
| 지금 위치에서 길찾기 | `js/here.js` |

### ⚠ 여러 사람에게 영향을 주는 곳 (고치기 전에 단톡방에 먼저 말하기)
| 무엇 | 파일 | 이유 |
|---|---|---|
| 불러오는 순서, 새 파일 추가 | `index.html` | 순서가 틀리면 앱이 안 떠요 |
| 공통 상태 `S`, 동작 `A`, `render()`, 저장 `store`, 이벤트 연결 | `js/ui.js` | 모든 화면이 씀 |
| 시트 목록 `SHEETS`, `L()`, 공유 코드 | `js/home.js` | 모든 시트·번역·공유가 씀 |
| 첫 실행 | `js/bootstrap.js` | 순서가 바뀌면 화면·저장이 꼬여요 |
| 데이터 모양(장소 필드 이름, 요금 구조) | `js/data.js` | engine·maps·guide가 다 읽음 |
| `config.js` 의 `IS_APP` | `js/config.js` | 문구·공유·뒤로가기가 바뀜 |

`ui.js` 는 A와 B가 같이 고칠 일이 많아요. **같은 날 같은 함수를 둘이 고치지 않도록** 먼저 "나 `schedTab` 고칠게" 하고 말해 주세요.

---

## 6. GitHub Desktop 협업 순서

> **맨 처음 한 번:** 한 사람(팀장)이 이 분리 결과를 `main` 에 올리고, 나머지 두 사람은 그걸 받은 다음에 각자 작업을 시작해요. 예전 한 파일짜리 `index.html` 을 고치던 작업은 새 구조에 옮겨서 다시 해야 해요.

1. **최신 main 받기**
   GitHub Desktop 위쪽 `Current branch` 를 `main` 으로 → **Fetch origin** → **Pull origin**.
2. **작업 브랜치 만들기**
   `Current branch` → **New branch** → 이름 예: `a/home-design`, `b/park-fix`, `c/add-spots` → Create.
3. **담당 파일 고치고 Commit · Push**
   VS Code에서 고치고 저장 → GitHub Desktop 왼쪽 아래 Summary에 "무엇을 왜" 한 줄 (예: `장소 3곳 추가`) → **Commit to 브랜치이름** → **Push origin** (처음엔 **Publish branch**).
4. **필요하면 최신 main 합치기**
   다른 사람 작업이 main에 들어갔으면: 메뉴 **Branch → Update from main**. 충돌(Conflict)이 나면 VS Code에서 `<<<<<<<` 표시된 곳을 둘 중 맞는 쪽으로 고치고 저장 → Commit.
5. **확인하고 PR로 main에 합치기**
   Live Server로 아래 7번 체크리스트를 확인 → GitHub Desktop **Create Pull Request** → 웹에서 팀원 한 명이 보고 **Merge**. 합친 뒤엔 모두 1번(main 받기)부터 다시.

작게 자주 올리는 게 충돌이 적어요. 하루 작업 = 브랜치 하나 정도가 좋아요.

---

## 7. PR 올리기 전 체크리스트

브라우저 개발자 도구(`F12` → Console)에 빨간 오류가 없는지 보면서 확인해요.

- [ ] 홈 화면이 뜬다
- [ ] 새 여행: 날짜 → 숙소 → 가고 싶은 곳 → 세부 계획 만들기
- [ ] 일정: 머무는 시간 ±, 순서 ↑↓, 끌어서 순서 바꾸기, 보류 → 다시 넣기, 직접 일정 넣기
- [ ] 저장 → 새로고침 → 다시 열기
- [ ] 숙소 바꾸기 → 동선이 바뀐다
- [ ] 지도 · 길안내 · 교통비 탭
- [ ] 日本語 ↔ 한국어
- [ ] 계획 공유하기: 코드 복사, 링크로 열기, 파일·코드로 가져오기
- [ ] 휴대폰 크기(F12 → 휴대폰 아이콘)와 다크 모드

(아이콘·사진 파일이 없어서 생기는 `404` 는 아래 8번 참고. 오류가 아니라 파일이 없는 거예요.)

---

## 8. 외부 파일과 서비스 현황

| 항목 | 상태 | 없을 때 |
|---|---|---|
| `manifest.webmanifest` | 저장소에 없음 | 홈 화면에 추가(설치) 정보가 없어요. 앱 동작은 그대로 |
| `icons/favicon-64.png`, `icons/apple-touch-icon.png` | 없음 | 브라우저 탭·홈 화면 아이콘이 기본 모양 |
| `photos/hero-day-1~5.jpg`, `photos/hero-nightview-1~4.jpg` | 없음 | 홈 위쪽이 그림(일러스트)으로 바뀜 |
| `photos/area-<동네>.jpg` (hakata, nakasu, tenjin, ohori, momochi, bayside, dazaifu, itoshima, noko, uminaka, yanagawa, yufuin, beppu, mojiko) | 없음 | 동네 카드가 사진 없이 표시 |
| `sw.js` | 쓰지 않기로 함 | 등록 코드를 지웠어요 (아래) |
| MapLibre(unpkg), OpenFreeMap, 국토지리원 타일, OpenStreetMap 타일, Nominatim, Google Fonts | 인터넷 필요 | 지도 → 간단한 안내 지도, 글꼴 → 기본 글꼴 |

### 서비스 워커(sw.js)와 오프라인
- `sw.js` 를 새로 등록하지 않아요.
- 예전 버전을 연 적이 있는 기기에는 서비스 워커가 남아 있을 수 있어요. `bootstrap.js` 가 **이 앱 폴더 범위의 것만** 해제해요. 같은 `github.io` 주소의 다른 프로젝트 서비스 워커와 저장된 계획·설정은 건드리지 않아요.
- 예전 서비스 워커가 옛 화면을 캐시에서 보여 주고 있는 기기는, 새 화면이 한 번 열려야 해제돼요. 안 바뀌면 새로고침을 한두 번 하면 돼요.
- 결과적으로 **오프라인 실행은 지원하지 않아요.** 인터넷이 없을 때 앱을 처음부터 열 수는 없어요.

자세한 수정 이력은 PR 설명이나 커밋 메시지를 보세요.
