window.SiteConfigEngine = {
  config: {},

  init() {
    const savedConfig = localStorage.getItem('site_config_draft');
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
        this.applyConfig(this.config);
      } catch (e) {
        this.loadDefaultConfig();
      }
    } else {
      this.loadDefaultConfig();
    }

    // Écoute les mises à jour en direct envoyées par le Customizer via iframe postMessage
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_CONFIG') {
        this.config = event.data.config;
        this.applyConfig(this.config);
      }
    });
  },

  loadDefaultConfig() {
    fetch('site-config.json')
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger site-config.json');
        return res.json();
      })
      .then((data) => {
        this.config = data;
        this.applyConfig(data);
      })
      .catch((err) => console.error('Erreur SiteConfigEngine :', err));
  },

  applyConfig(cfg) {
    if (!cfg) return;
    const root = document.documentElement;

    // 1. Application des Couleurs
    if (cfg.theme) {
      if (cfg.theme.primary) root.style.setProperty('--color-primary', cfg.theme.primary);
      if (cfg.theme.secondary) root.style.setProperty('--color-secondary', cfg.theme.secondary);
      if (cfg.theme.accent) root.style.setProperty('--color-accent', cfg.theme.accent);
      if (cfg.theme.background) root.style.setProperty('--color-background', cfg.theme.background);
      if (cfg.theme.card) root.style.setProperty('--color-card', cfg.theme.card);
      if (cfg.theme.text) root.style.setProperty('--color-text', cfg.theme.text);
      if (cfg.theme.border) root.style.setProperty('--color-border', cfg.theme.border);
      if (cfg.theme.button) root.style.setProperty('--color-button', cfg.theme.button);
      if (cfg.theme.buttonText) root.style.setProperty('--color-button-text', cfg.theme.buttonText);
      if (cfg.theme.borderRadius !== undefined) root.style.setProperty('--radius', cfg.theme.borderRadius + 'px');
      if (cfg.theme.shadow) root.style.setProperty('--shadow', cfg.theme.shadow);
    }

    // 2. Application de la Typographie
    if (cfg.typography) {
      if (cfg.typography.headingFont) root.style.setProperty('--font-heading', cfg.typography.headingFont);
      if (cfg.typography.bodyFont) root.style.setProperty('--font-body', cfg.typography.bodyFont);
    }

    // 3. Liaison automatique des textes et images avec [data-config]
    document.querySelectorAll('[data-config]').forEach((el) => {
      const keyPath = el.getAttribute('data-config').split('.');
      let val = cfg;
      keyPath.forEach((k) => {
        val = val ? val[k] : null;
      });

      if (val !== undefined && val !== null) {
        if (el.tagName === 'IMG') {
          el.src = val;
        } else if (el.tagName === 'A' && el.getAttribute('data-config-attr') === 'href') {
          el.href = val;
        } else {
          el.innerText = val;
        }
      }
    });

    // 4. Rendu dynamique des structures répétitives (Chambres, Restaurant, Services)
    this.renderRoomsUI(cfg.rooms);
    this.renderRestaurantUI(cfg.restaurant);
    this.renderServicesUI(cfg.services);

    // 5. Notification globale pour les scripts tiers (Réservation / Stripe)
    window.dispatchEvent(new CustomEvent('siteConfigUpdated', { detail: cfg }));
  },

  renderRoomsUI(rooms) {
    const container = document.getElementById('rooms-list-container');
    if (!container || !Array.isArray(rooms)) return;

    container.innerHTML = rooms.map(room => `
      <div class="room-card" data-room-id="${room.id}">
        <div class="room-image-wrapper">
          <img src="${(room.images && room.images[0]) ? room.images[0] : 'placeholder-room.jpg'}" alt="${room.name}" class="room-img">
        </div>
        <div class="room-details">
          <h3>${room.name}</h3>
          <p class="room-desc">${room.description}</p>
          <div class="room-meta">
            <span>📐 ${room.surface} m²</span>
            <span>👥 ${room.capacity} pers.</span>
          </div>
          <ul class="room-amenities">
            ${(room.amenities || []).map(a => `<li>✓ ${a}</li>`).join('')}
          </ul>
          <div class="room-footer">
            <span class="room-price"><strong>${room.pricePerNight} €</strong> / nuit</span>
            <button class="btn-primary select-room-btn" onclick="selectRoomForBooking('${room.id}', ${room.pricePerNight})">Choisir</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderRestaurantUI(menu) {
    const container = document.getElementById('restaurant-menu-container');
    if (!container || !Array.isArray(menu)) return;

    container.innerHTML = menu.map(cat => `
      <div class="menu-category">
        <h2>${cat.category}</h2>
        <div class="menu-items-grid">
          ${(cat.items || []).map(item => `
            <div class="menu-item-card">
              ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
              <div class="menu-item-info">
                <div class="menu-item-header">
                  <h4>${item.name}</h4>
                  <span class="price">${item.price} €</span>
                </div>
                <p>${item.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  renderServicesUI(services) {
    const container = document.getElementById('services-list-container');
    if (!container || !Array.isArray(services)) return;

    container.innerHTML = services.map(serv => `
      <div class="service-card">
        ${serv.image ? `<img src="${serv.image}" alt="${serv.name}">` : ''}
        <h3>${serv.name}</h3>
        <p>${serv.description}</p>
        <span class="service-price">${serv.price} €</span>
      </div>
    `).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => window.SiteConfigEngine.init());
