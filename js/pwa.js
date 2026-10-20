// PWA & Service Worker Manager
let deferredInstallPrompt = null;

const PWA = {
  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupNetworkStatus();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('OTRO Service Worker registrado con éxito:', reg.scope);
          })
          .catch((err) => {
            console.log('Service Worker no se pudo registrar:', err);
          });
      });
    }
  },

  setupInstallPrompt() {
    const installBanner = document.getElementById('pwa-install-banner');
    const installBtn = document.getElementById('pwa-install-action-btn');
    const closeBtn = document.getElementById('pwa-install-close-btn');
    const isDismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      deferredInstallPrompt = e;

      // Show custom install banner only if not dismissed
      if (installBanner && !isDismissed) {
        installBanner.classList.add('visible');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredInstallPrompt = null;
        if (installBanner) {
          installBanner.classList.remove('visible');
        }
        localStorage.setItem('pwa_banner_dismissed', 'true');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (installBanner) {
          installBanner.classList.remove('visible');
        }
        localStorage.setItem('pwa_banner_dismissed', 'true');
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('OTRO PWA instalada exitosamente');
      deferredInstallPrompt = null;
      if (installBanner) {
        installBanner.classList.remove('visible');
      }
    });
  },

  setupNetworkStatus() {
    const updateOnlineStatus = () => {
      const banner = document.getElementById('offline-indicator');
      if (banner) {
        if (!navigator.onLine) {
          banner.classList.add('visible');
        } else {
          banner.classList.remove('visible');
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
};

PWA.init();
