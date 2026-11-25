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

// MOTION: 움직임 세기·속도는 여기서만 바꾸면 돼요 (ms = 1000분의 1초)
const MOTION = {
  foldMs: 950, //      펼쳐지는 시간 (전체 약 800~1100ms 권장)
  foldStagger: 80, //  면마다 시작 간격 (60~100ms)
  foldAngle: 72, //    처음 접혀 있는 각도 (클수록 더 많이 접혀 있다가 펼쳐져요)
  softMs: 450, //      soft 모드: 글자가 떠오르는 시간 (300~600ms)
  softShift: 14, //    soft 모드: 아래에서 올라오는 거리(px)
  pageMs: 240, //      화면 전환 시간 (200~300ms)
  pageShift: 16, //    화면 전환 때 옆으로 미끄러지는 거리(px)
  sheetMs: 240 //      아래 시트가 열리고 닫히는 시간
};
