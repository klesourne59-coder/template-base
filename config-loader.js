// config-loader.js — Code complet et corrigé

let currentConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
  await initConfig();
  
  // Écoute des messages envoyés en temps réel par le customizer (iframe)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPDATE_CONFIG') {
      currentConfig = event.data.config;
      applyConfig(currentConfig);
    }
  });
});

/**
 * Initialise la configuration au chargement
 */
async function initConfig() {
  const localData = localStorage.getItem('site_config_live');
  if (localData) {
    try {
      currentConfig = JSON.parse(localData);
      applyConfig(currentConfig);
      return;
    } catch (e) {
      console.warn('LocalStorage invalide, chargement du fichier site-config.json.');
    }
  }

  try {
    const res = await fetch('site-config.json');
    if (res.ok) {
      currentConfig = await res.json();
      applyConfig(currentConfig);
    }
  } catch (err) {
    console.error('Erreur lors du chargement de site-config.json :', err);
  }
}

/**
 * Applique la configuration à l'ensemble de la page HTML
 */
function applyConfig(config) {
  if (!config) return;

  // 1. THÈME & COULEURS (Variables CSS)
  const root = document.documentElement;
  if (config.theme) {
    if (config.theme.primary) root.style.setProperty('--primary-color', config.theme.primary);
    if (config.theme.secondary) root.style.setProperty('--secondary-color', config.theme.secondary);
    if (config.theme.accent) root.style.setProperty('--accent-color', config.theme.accent);
  }

  // 2. TYPOGRAPHIE
  if (config.typography) {
    if (config.typography.headingFont) {
      root.style.setProperty('--font-heading', config.typography.headingFont);
    }
    if (config.typography.bodyFont) {
      root.style.setProperty('--font-body', config.typography.bodyFont);
    }
  }

  // 3. IDENTITÉ DU SITE & LOGO
  if (config.site) {
    updateText('[data-config="site.name"]', config.site.name);
    updateImage('[data-config="site.logo"]', config.site.logo);
  }

  // 4. EN-TÊTE & HERO
  if (config.hero) {
    updateText('[data-config="hero.title"]', config.hero.title);
    updateText('[data-config="hero.subtitle"]', config.hero.subtitle);
  }

  // 5. CONTACT
  if (config.contact) {
    updateText('[data-config="contact.phone"]', config.contact.phone);
    updateText('[data-config="contact.email"]', config.contact.email);
  }

  // 6. COLLECTIONS DYNAMIQUES
  renderRooms(config.rooms || []);
  renderRestaurant(config.restaurant || []);
  renderServices(config.services || []);
}

/**
 * Helper pour mettre à jour le texte d'un ou plusieurs éléments
 */
function updateText(selector, text) {
  if (text === undefined || text === null) return;
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = text;
  });
}

/**
 * Helper pour mettre à jour la source d'une image
 */
function updateImage(selector, src) {
  if (!src) return;
  document.querySelectorAll(selector).forEach(img => {
    img.src = src;
  });
}

/**
 * Rendu dynamique de la liste des chambres
 */
function renderRooms(rooms) {
  const container = document.querySelector('#rooms-list, #rooms-container, [data-config-list="rooms"]');
  if (!container) return;

  container.innerHTML = rooms.map(room => `
    <article class="room-card">
      ${room.image ? `<img src="${room.image}" alt="${room.name || ''}" class="room-image" />` : ''}
      <div class="room-details">
        <h3>${room.name || 'Chambre'}</h3>
        ${room.price ? `<p class="room-price">${room.price} €</p>` : ''}
        <p class="room-description">${room.description || ''}</p>
      </div>
    </article>
  `).join('');
}

/**
 * Rendu dynamique de la carte du restaurant
 */
function renderRestaurant(items) {
  const container = document.querySelector('#restaurant-list, #restaurant-container, [data-config-list="restaurant"]');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <article class="restaurant-card">
      ${item.image ? `<img src="${item.image}" alt="${item.name || ''}" class="restaurant-image" />` : ''}
      <div class="restaurant-details">
        <h3>${item.name || 'Plat'}</h3>
        ${item.price ? `<p class="restaurant-price">${item.price} €</p>` : ''}
        <p class="restaurant-description">${item.description || ''}</p>
      </div>
    </article>
  `).join('');
}

/**
 * Rendu dynamique des services
 */
function renderServices(services) {
  const container = document.querySelector('#services-list, #services-container, [data-config-list="services"]');
  if (!container) return;

  container.innerHTML = services.map(service => `
    <article class="service-card">
      ${service.image ? `<img src="${service.image}" alt="${service.name || ''}" class="service-image" />` : ''}
      <div class="service-details">
        <h3>${service.name || 'Service'}</h3>
        ${service.price ? `<p class="service-price">${service.price} €</p>` : ''}
        <p class="service-description">${service.description || ''}</p>
      </div>
    </article>
  `).join('');
}