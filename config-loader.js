(async function loadConfig() {
  let config = null;

  // 1. Vérifie si une configuration existe dans le LocalStorage (mode local/demo)
  const savedConfig = localStorage.getItem('site_config');
  if (savedConfig) {
    try {
      config = JSON.parse(savedConfig);
    } catch (e) {
      console.error("Erreur de lecture du localStorage", e);
    }
  }

  // 2. Sinon, charge le fichier JSON du serveur
  if (!config) {
    try {
      const response = await fetch('site-config.json');
      if (response.ok) {
        config = await response.json();
      }
    } catch (err) {
      console.warn("Impossible de charger site-config.json", err);
    }
  }

  // 3. Application de la configuration
  if (config) {
    applyConfig(config);
  }

  // Écoute des mises à jour en direct depuis le Customizer
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPDATE_CONFIG') {
      applyConfig(event.data.config);
    }
  });

  function applyConfig(cfg) {
    if (!cfg) return;

    // Couleurs
    if (cfg.theme && cfg.theme.colors) {
      const root = document.documentElement;
      if (cfg.theme.colors.secondary) root.style.setProperty('--color-secondary', cfg.theme.colors.secondary);
      if (cfg.theme.colors.background) root.style.setProperty('--color-background', cfg.theme.colors.background);
      if (cfg.theme.colors.card) root.style.setProperty('--color-card', cfg.theme.colors.card);
    }

    // Nom de la marque
    if (cfg.identity && cfg.identity.name) {
      document.querySelectorAll('.brand-name').forEach(el => el.textContent = cfg.identity.name);
    }

    // Image Hero
    if (cfg.images && cfg.images.heroBackground) {
      const hero = document.querySelector('.hero');
      if (hero) {
        hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${cfg.images.heroBackground}')`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
      }
    }
  }
})();