// Global config state
let currentConfig = {};

// 1. Initialisation : Chargement du fichier de configuration ou du brouillon local
document.addEventListener('DOMContentLoaded', () => {
  fetch('site-config.json')
    .then((res) => {
      if (!res.ok) throw new Error('Erreur de chargement du fichier site-config.json');
      return res.json();
    })
    .then((defaultConfig) => {
      const saved = localStorage.getItem('site_config_draft');
      currentConfig = saved ? JSON.parse(saved) : defaultConfig;
      applyConfig(currentConfig);
    })
    .catch((err) => console.error('Config Loader Error:', err));
});

// 2. Écoute des mises à jour en temps réel (Customizer iframe)
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_CONFIG') {
    currentConfig = event.data.config;
    applyConfig(currentConfig);
  }
});

// 3. Application globale de la configuration au DOM
function applyConfig(config) {
  if (!config) return;

  // Binding des champs simples (data-config="hero.title", etc.)
  document.querySelectorAll('[data-config]').forEach((el) => {
    const path = el.getAttribute('data-config').split('.');
    let val = config;
    path.forEach((key) => {
      val = val ? val[key] : undefined;
    });

    if (val !== undefined && val !== null) {
      if (el.tagName === 'IMG') {
        el.src = val;
      } else if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('tel:')) {
        el.href = `tel:${val}`;
        el.textContent = val;
      } else if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('mailto:')) {
        el.href = `mailto:${val}`;
        el.textContent = val;
      } else {
        el.textContent = val;
      }
    }
  });

  // Rendu des listes dynamiques
  renderRooms(config.rooms);
  renderRestaurant(config.restaurant);
  renderServices(config.services);
}

// 4. Rendu dynamique des Chambres
function renderRooms(rooms) {
  const container = document.getElementById('rooms-list');
  if (!container || !Array.isArray(rooms)) return;

  container.innerHTML = rooms
    .map(
      (room) => `
    <article class="room-card">
      ${room.images && room.images[0] ? `<img src="${room.images[0]}" alt="${room.name || ''}" class="room-image">` : ''}
      <div class="room-details">
        <h3>${room.name || 'Chambre'}</h3>
        <p class="room-description">${room.description || ''}</p>
        <ul class="room-specs">
          ${room.capacity ? `<li><strong>Capacité :</strong> ${room.capacity} pers.</li>` : ''}
          ${room.surface ? `<li><strong>Surface :</strong> ${room.surface} m²</li>` : ''}
        </ul>
        <div class="room-footer">
          <span class="room-price">${room.pricePerNight ? `${room.pricePerNight} € / nuit` : ''}</span>
          <a href="reservation.html?room=${encodeURIComponent(room.id || room.name)}" class="btn-book">Réserver</a>
        </div>
      </div>
    </article>
  `
    )
    .join('');
}

// 5. Rendu dynamique du Menu Restaurant (Catégories + Plats)
function renderRestaurant(restaurantData) {
  const container = document.getElementById('restaurant-menu');
  if (!container || !Array.isArray(restaurantData)) return;

  container.innerHTML = restaurantData
    .map(
      (cat) => `
    <div class="menu-category">
      <h3 class="category-title">${cat.category || 'Catégorie'}</h3>
      <div class="menu-items-grid">
        ${(cat.items || [])
          .map(
            (item) => `
          <div class="menu-item">
            ${item.image ? `<img src="${item.image}" alt="${item.name || ''}" class="menu-item-img">` : ''}
            <div class="menu-item-content">
              <div class="menu-item-header">
                <span class="item-name">${item.name || ''}</span>
                <span class="item-price">${item.price ? `${item.price} €` : ''}</span>
              </div>
              <p class="item-description">${item.description || ''}</p>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
    )
    .join('');
}

// 6. Rendu dynamique des Services (Spa, Activités, etc.)
function renderServices(services) {
  const container = document.getElementById('services-list');
  if (!container || !Array.isArray(services)) return;

  container.innerHTML = services
    .map(
      (service) => `
    <div class="service-card">
      ${service.image ? `<img src="${service.image}" alt="${service.name || ''}" class="service-image">` : ''}
      <div class="service-info">
        <h3>${service.name || 'Service'}</h3>
        <p>${service.description || ''}</p>
        ${service.price ? `<span class="service-price">${service.price} €</span>` : ''}
      </div>
    </div>
  `
    )
    .join('');
}