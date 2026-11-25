// ======================================================================
// bootstrap.js · 모든 파일을 다 불러온 다음 맨 마지막에 한 번 실행해요
// 원래 index.html 맨 끝에 있던 첫 실행 순서를 그대로 옮겼어요.
//   applyLang() → startTr() → render() → store.init()
// 공유 링크(#share=) 첫 확인도 여기서 해요. (예전엔 home.js 가운데에 있어서,
// 파일을 나누면 다른 파일이 준비되기 전에 실행될 수 있었어요)
// hashchange 감시는 home.js 에서 한 번만 등록해요. 여기서 또 등록하지 않아요.
// ======================================================================
applyLang();
startTr();
render();
store.init();
// 예전과 같은 때: 위의 첫 실행이 다 끝난 다음 차례에 확인해요
setTimeout(checkShareLink, 0);

// ---- 서비스 워커(sw.js) 정리 ----
// sw.js 는 쓰지 않기로 했어요. 그래서 새로 등록하지 않아요.
// 예전에 이 앱 주소에 설치된 서비스 워커가 있으면 해제만 해요.
// (저장한 여행 계획·설정(localStorage)은 건드리지 않아요.
//  같은 github.io 주소의 다른 프로젝트 서비스 워커도 건드리지 않게, 이 앱 폴더 범위만 골라요)
if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
  window.addEventListener('load', () => {
    const here = new URL('./', location.href).href;
    navigator.serviceWorker
      .getRegistrations()
      .then(regs => regs.filter(r => r.scope && r.scope.startsWith(here)).forEach(r => r.unregister()))
      .catch(() => {});
  });
}
