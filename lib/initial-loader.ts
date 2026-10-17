export const INITIAL_LOADER_SESSION_KEY = 'mfsl_initial_loader_seen_v1';
export const INITIAL_LOADER_MIN_MS = 800;
export const INITIAL_LOADER_MAX_MS = 8_000;
export const INITIAL_LOADER_FINISH_MS = 240;
export const INITIAL_LOADER_CURTAIN_MS = 900;
export const INITIAL_LOADER_FADE_MS = 200;

/** Runs before the page markup/hydration so repeat visits never flash the overlay. */
export function initialLoaderBootstrap(publicEnabled: boolean, adminEnabled: boolean) {
  return `(function(){
    var root=document.documentElement;
    var admin=/^\\/admin(?:\\/|$)/.test(location.pathname);
    if(!(admin?${adminEnabled}:${publicEnabled}))return;
    try{
      if(sessionStorage.getItem('${INITIAL_LOADER_SESSION_KEY}'))return;
      sessionStorage.setItem('${INITIAL_LOADER_SESSION_KEY}','1');
    }catch(e){}
    var previousGutter=root.style.scrollbarGutter;
    root.style.scrollbarGutter='stable';
    var gutter=Math.max(0,innerWidth-root.clientWidth);
    root.style.scrollbarGutter=previousGutter;
    root.style.setProperty('--initial-loader-gutter',gutter+'px');
    root.dataset.initialLoader='loading';
    root.dataset.initialLoaderStarted=String(performance.now());
    root.dataset.initialLoaderTimeout=String(setTimeout(function(){
      if(root.dataset.initialLoader!=='loading')return;
      root.dataset.initialLoader='opening';
      setTimeout(function(){
        delete root.dataset.initialLoader;
        delete root.dataset.initialLoaderStarted;
        delete root.dataset.initialLoaderTimeout;
        root.style.removeProperty('--initial-loader-gutter');
      },matchMedia('(prefers-reduced-motion: reduce)').matches?${INITIAL_LOADER_FADE_MS}:${INITIAL_LOADER_CURTAIN_MS});
    },${INITIAL_LOADER_MAX_MS}));
  })();`;
}
