window.SiteConfigEngine = {
  config: {},

  init() {
    const savedConfig = localStorage.getItem('site_config_draft');
    if (savedConfig) {
      this.config = JSON.parse(savedConfig);
      this.applyConfig(this.config);
    } else {
      fetch('config.json')
        .then((res) => res.json())
        .then((data) => {
          this.config = data;
          this.applyConfig(data);
        })
        .catch((err) => console.error('Erreur chargement config.json :', err));
    }

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_CONFIG') {
        this.config = event.data.config;
        this.applyConfig(this.config);
      }
    });
  },

  applyConfig(cfg) {
    const root = document.documentElement;

    if (cfg.theme) {
      if (cfg.theme.primary) root.style.setProperty('--color-primary', cfg.theme.primary);
      if (cfg.theme.secondary) root.style.setProperty('--color-secondary', cfg.theme.secondary);
      if (cfg.theme.bg) root.style.setProperty('--color-bg', cfg.theme.bg);
      if (cfg.theme.text) root.style.setProperty('--color-text', cfg.theme.text);
      if (cfg.theme.btnBg) root.style.setProperty('--btn-bg', cfg.theme.btnBg);
      if (cfg.theme.btnText) root.style.setProperty('--btn-text', cfg.theme.btnText);
      if (cfg.theme.btnRadius !== undefined) root.style.setProperty('--btn-radius', cfg.theme.btnRadius + 'px');
      if (cfg.theme.fontHeading) root.style.setProperty('--font-heading', cfg.theme.fontHeading);
      if (cfg.theme.fontBody) root.style.setProperty('--font-body', cfg.theme.fontBody);
    }

    document.querySelectorAll('[data-config]').forEach((el) => {
      const keyPath = el.getAttribute('data-config').split('.');
      let val = cfg;
      keyPath.forEach((k) => {
        val = val ? val[k] : null;
      });

      if (val !== undefined && val !== null) {
        if (el.tagName === 'IMG') {
          el.src = val;
        } else {
          el.innerText = val;
        }
      }
    });

    window.dispatchEvent(new CustomEvent('siteConfigUpdated', { detail: cfg }));
  }
};

document.addEventListener('DOMContentLoaded', () => window.SiteConfigEngine.init());