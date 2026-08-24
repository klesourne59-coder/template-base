// config-loader.js — Chargeur de configuration universel (index.html & reservation.html)

window.siteConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initConfig();

  // Écoute des mises à jour en temps réel envoyées par le Customizer via Iframe
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPDATE_CONFIG') {
      window.siteConfig = event.data.config;
      applyConfig(window.siteConfig);
    }
  });
});

/**
 * Initialise et charge la configuration depuis localStorage ou site-config.json
 */
async function initConfig() {
  const localData = localStorage.getItem('site_config_live');
  if (localData) {
    try {
      window.siteConfig = JSON.parse(localData);
      applyConfig(window.siteConfig);
      return;
    } catch (e) {
      console.warn('LocalStorage corrompu, chargement du fichier site-config.json.');
    }
  }

  try {
    const res = await fetch('site-config.json');
    if (res.ok) {
      window.siteConfig = await res.json();
      applyConfig(window.siteConfig);
    }
  } catch (err) {
    console.error('Erreur de chargement du fichier site-config.json :', err);
  }
}

/**
 * Applique l'intégralité de la configuration au document courant
 */
function applyConfig(config) {
  if (!config) return;

  // 1. SYSTÈME DE VARIABLES CSS UNIFIÉ (Centralisé dans styles.css)
  const root = document.documentElement;
  if (config.theme) {
    if (config.theme.primary) root.style.setProperty('--primary-color', config.theme.primary);
    if (config.theme.secondary) root.style.setProperty('--secondary-color', config.theme.secondary);
    if (config.theme.accent) root.style.setProperty('--accent-color', config.theme.accent);
    if (config.theme.background) root.style.setProperty('--bg-color', config.theme.background);
    if (config.theme.text) root.style.setProperty('--text-color', config.theme.text);
  }

  if (config.typography) {
    if (config.typography.headingFont) root.style.setProperty('--font-heading', config.typography.headingFont);
    if (config.typography.bodyFont) root.style.setProperty('--font-body', config.typography.bodyFont);
  }

  // 2. TEXTES ET IMAGES DE L'IDENTITÉ & DU HERO
  if (config.site) {
    updateElementsText('[data-config="site.name"]', config.site.name);
    updateElementsImage('[data-config="site.logo"]', config.site.logo);
  }

  if (config.hero) {
    updateElementsText('[data-config="hero.title"]', config.hero.title);
    updateElementsText('[data-config="hero.subtitle"]', config.hero.subtitle);
  }

  if (config.contact) {
    updateElementsText('[data-config="contact.phone"]', config.contact.phone);
    updateElementsText('[data-config="contact.email"]', config.contact.email);
    updateElementsText('[data-config="contact.address"]', config.contact.address);
  }

  // 3. SECTIONS DYNAMIQUES DU SITE PRINCIPAL
  renderRoomsList(config.rooms || []);
  renderRestaurantList(config.restaurant || []);
  renderServicesList(config.services || []);

  // 4. ALIMENTATION DYNAMIQUE DU FORMULAIRE DE RÉSERVATION
  populateReservationSelect(config.rooms || []);

  // Événement personnalisé pour avertir d'autres modules (ex: scripts.js)
  document.dispatchEvent(new CustomEvent('siteConfigApplied', { detail: config }));
}

/**
 * Met à jour le texte des éléments ciblés
 */
function updateElementsText(selector, text) {
  if (text === undefined || text === null) return;
  document.querySelectorAll(selector).forEach(el => {
    el.textContent = text;
  });
}

/**
 * Met à jour la source d'image des éléments ciblés
 */
function updateElementsImage(selector, src) {
  if (!src) return;
  document.querySelectorAll(selector).forEach(img => {
    img.src = src;
  });
}

/**
 * Rendu des chambres sur le site principal (avec attributs complets et galeries)
 */
function renderRoomsList(rooms) {
  const container = document.querySelector('#rooms-list, [data-config-list="rooms"]');
  if (!container) return;

  container.innerHTML = rooms.map(room => {
    const images = Array.isArray(room.images) && room.images.length > 0 
      ? room.images 
      : (room.image ? [room.image] : []);

    const amenitiesList = Array.isArray(room.amenities)
      ? room.amenities.map(a => `<li>${a}</li>`).join('')
      : '';

    return `
      <article class="room-card" data-room-id="${room.id || ''}">
        ${images.length > 0 ? `
          <div class="room-gallery">
            <img src="${images[0]}" alt="${room.name || ''}" class="room-main-image" />
            ${images.length > 1 ? `
              <div class="room-thumbnails">
                ${images.map(imgSrc => `<img src="${imgSrc}" alt="${room.name || ''}" class="room-thumb" />`).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        <div class="room-info">
          <h3>${room.name || 'Chambre'}</h3>
          <div class="room-meta">
            ${room.price ? `<span class="room-price"><strong>${room.price} €</strong> / nuit</span>` : ''}
            ${room.capacity ? `<span class="room-capacity">👥 ${room.capacity} pers.</span>` : ''}
            ${room.surface ? `<span class="room-surface">📐 ${room.surface} m²</span>` : ''}
          </div>
          <p class="room-description">${room.description || ''}</p>
          ${amenitiesList ? `<ul class="room-amenities">${amenitiesList}</ul>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Rendu de la carte du restaurant
 */
function renderRestaurantList(items) {
  const container = document.querySelector('#restaurant-list, [data-config-list="restaurant"]');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <article class="restaurant-card">
      ${item.image ? `<img src="${item.image}" alt="${item.name || ''}" class="restaurant-image" />` : ''}
      <div class="restaurant-info">
        <header>
          <h3>${item.name || 'Plat'}</h3>
          ${item.price ? `<span class="restaurant-price">${item.price} €</span>` : ''}
        </header>
        ${item.category ? `<span class="restaurant-category">${item.category}</span>` : ''}
        <p class="restaurant-description">${item.description || ''}</p>
      </div>
    </article>
  `).join('');
}

/**
 * Rendu des services
 */
function renderServicesList(services) {
  const container = document.querySelector('#services-list, [data-config-list="services"]');
  if (!container) return;

  container.innerHTML = services.map(service => `
    <article class="service-card">
      ${service.image ? `<img src="${service.image}" alt="${service.name || ''}" class="service-image" />` : ''}
      <div class="service-info">
        <h3>${service.name || 'Service'}</h3>
        ${service.price ? `<span class="service-price">${service.price} €</span>` : ''}
        <p class="service-description">${service.description || ''}</p>
      </div>
    </article>
  `).join('');
}

/**
 * Alimentation dynamique du sélecteur de chambres dans le formulaire de réservation
 */
function populateReservationSelect(rooms) {
  const select = document.querySelector('select#room-select, select[name="room"]');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Sélectionnez une chambre --</option>' + rooms.map(room => `
    <option value="${room.id || room.name}" data-price="${room.price || 0}" data-capacity="${room.capacity || ''}">
      ${room.name} — ${room.price} € / nuit
    </option>
  `).join('');

  if (currentVal && Array.from(select.options).some(opt => opt.value === currentVal)) {
    select.value = currentVal;
  }
}