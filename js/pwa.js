window.STARUP_PWA = (() => {
  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: fullscreen)').matches ||
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
  }

  function registerSW() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function promptInstall(onResult) {
    if (!deferredPrompt) {
      if (onResult) onResult('unavailable');
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
      deferredPrompt = null;
      if (onResult) onResult(choice.outcome);
    }).catch(() => {
      if (onResult) onResult('error');
    });
  }

  function init() {
    registerSW();
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('btnInstallPWA');
      if (btn) btn.classList.remove('hidden');
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      const btn = document.getElementById('btnInstallPWA');
      if (btn) btn.classList.add('hidden');
    });
  }

  return {
    init,
    promptInstall,
    canInstall: () => !!deferredPrompt,
    isStandalone,
    isIOS
  };
})();

window.addEventListener('load', () => window.STARUP_PWA.init());
