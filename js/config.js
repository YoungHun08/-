// ======================================================================
// config.js · 다른 파일보다 먼저 필요한 설정
// IS_APP: true 면 휴대폰 앱처럼 동작(계획 공유하기 문구, 파일로 저장, 뒤로가기 처리, 저장공간 유지 요청)
// ======================================================================
const IS_APP = true;

// ---- 첫 화면 등장 효과 (motion.js) ----
// INTRO_MODE: 앱을 처음 열 때 표지가 나타나는 방식 (한 번만)
//   'fold3d' = 3면 여행 팸플릿처럼 풍경이 촤라락 펼쳐져요
//   'soft'   = 3D 없이 제목·설명·버튼이 살짝 떠오르며 나타나요
const INTRO_PRESET = 'fold3d'; // ← 'fold3d' 또는 'soft'
// (개발용 비교 페이지 dev/intro-compare.html 만 주소 뒤 ?intro=soft 처럼 붙여서 잠깐 바꿔 봐요)
const INTRO_MODE = (() => {
  const q = new URLSearchParams(location.search).get('intro');
  return q === 'soft' || q === 'fold3d' ? q : INTRO_PRESET;
})();

// MOTION: 움직임 세기·속도는 여기서만 바꾸면 돼요 (ms = 1000분의 1초, Shift = 움직이는 거리 px)
const MOTION = {
  // 첫 화면 등장
  foldMs: 950, //        펼쳐지는 시간 (전체 약 800~1100ms 권장)
  foldStagger: 80, //    면마다 시작 간격 (60~100ms)
  foldAngle: 72, //      처음 접혀 있는 각도 (클수록 더 많이 접혀 있다가 펼쳐져요)
  softMs: 450, //        soft 모드: 글자가 떠오르는 시간 (300~600ms)
  softShift: 14, //      soft 모드: 아래에서 올라오는 거리
  photoWait: 1200, //    첫 사진을 기다리는 최대 시간. 그 안에 오면 사진으로 시작, 늦으면 그림으로 시작
  // 화면 전환
  pageMs: 270, //        큰 화면 앞·뒤 이동 (홈 ↔ 새 여행 단계 ↔ 계획, 다른 여행 열기)
  pageShift: 18, //      큰 화면 이동 거리
  tabMs: 220, //         같은 화면의 탭 이동 (홈 아래 메뉴, 계획의 일정·지도·길안내·교통비)
  tabShift: 12, //       탭 이동 거리
  subMs: 190, //         일차·하위 내용 바뀜 (동네 분류, 달력 달, 시트 안 탭·카테고리, 일본어 표현)
  subShift: 8, //        하위 내용 이동 거리
  sheetMs: 250, //       시트 열기·닫기
  sheetRise: 36, //      시트가 올라오는 거리
  sheetInnerMs: 220, //  열린 시트 안에서 상세로 들어가기·돌아오기
  sheetInnerShift: 16, //시트 안 상세 이동 거리
  expandMs: 200, //      펼치기·접기 (일정 카드, 보류함 등)
  panelMs: 210, //       조건에 따라 생기고 없어지는 칸 (결과 배너, 검색 결과, 좌표칸, 안내 문구)
  noteMs: 190, //        알림(토스트)·작은 안내가 나타나고 사라지는 시간
  outPart: 0.45, //      이전 화면이 빠지는 시간 비율 (전환 시간 × 이 값). 작을수록 겹쳐 보이는 시간이 짧아요
  inDelay: 0, //         새 화면이 들어오기 시작하는 시점 (ms)
  ease: 'cubic-bezier(.2, .8, .2, 1)', //   들어올 때: 빨리 반응하고 부드럽게 멈춤
  easeOut: 'cubic-bezier(.2, .6, .4, 1)' // 나갈 때: 누르자마자 바로 빠지기 시작
};

// 스크롤도 '동작 줄이기' 설정을 따라요 (부드럽게 / 바로)
function scrollMode() {
  return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
