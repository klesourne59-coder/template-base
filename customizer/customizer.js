// customizer/customizer.js — Script de personnalisation complet

let currentConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  renderForm();
  bindGlobalEvents();
  updatePreview();
});

/**
 * Charge la configuration depuis le LocalStorage ou site-config.json
 */
async function loadConfig() {
  const localData = localStorage.getItem('site_config_live');
  if (localData) {
    try {
      currentConfig = JSON.parse(localData);
      return;
    } catch (e) {
      console.warn('LocalStorage invalide. Repli sur site-config.json.');
    }
  }

  try {
    const res = await fetch('../site-config.json');
    if (res.ok) {
      currentConfig = await res.json();
    }
  } catch (err) {
    console.error('Impossible de charger site-config.json :', err);
  }
}

/**
 * Sauvegarde la configuration et met à jour l'aperçu dans l'iframe
 */
function saveAndSync() {
  localStorage.setItem('site_config_live', JSON.stringify(currentConfig));
  updatePreview();
}

/**
 * Transmet la configuration actualisée à l'iframe via postMessage
 */
function updatePreview() {
  const iframe = document.getElementById('preview-iframe') || document.querySelector('iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'UPDATE_CONFIG',
      config: currentConfig
    }, '*');
  }
}

/**
 * Génère et remplit l'ensemble des champs du formulaire
 */
function renderForm() {
  // 1. Thème & Couleurs
  setInputValue('#theme-primary', currentConfig.theme?.primary || '#1b365d');
  setInputValue('#theme-secondary', currentConfig.theme?.secondary || '#c5a059');
  setInputValue('#theme-accent', currentConfig.theme?.accent || '#d4af37');
  setInputValue('#theme-bg', currentConfig.theme?.background || '#f8f9fa');
  setInputValue('#theme-text', currentConfig.theme?.text || '#212529');

  // 2. Typographie
  setInputValue('#typography-heading', currentConfig.typography?.headingFont || "'Playfair Display', serif");
  setInputValue('#typography-body', currentConfig.typography?.bodyFont || "'Montserrat', sans-serif");

  // 3. Identité du site & Hero
  setInputValue('#site-name', currentConfig.site?.name || '');
  setInputValue('#site-logo-url', currentConfig.site?.logo || '');

  setInputValue('#hero-title', currentConfig.hero?.title || '');
  setInputValue('#hero-subtitle', currentConfig.hero?.subtitle || '');

  // 4. Contact
  setInputValue('#contact-phone', currentConfig.contact?.phone || '');
  setInputValue('#contact-email', currentConfig.contact?.email || '');
  setInputValue('#contact-address', currentConfig.contact?.address || '');

  // 5. Collections dynamiques
  renderRoomsEditor();
  renderRestaurantEditor();
  renderServicesEditor();
}

/**
 * Attache les écouteurs d'événements globaux
 */
function bindGlobalEvents() {
  const form = document.getElementById('customizer-form') || document.body;

  form.addEventListener('input', (e) => {
    const target = e.target;
    if (target.dataset.configKey) {
      updateConfigProperty(target.dataset.configKey, target.value);
    }
  });

  // Gestion de l'upload d'image pour le logo du site
  const logoFileInput = document.getElementById('site-logo-file');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        convertFileToBase64(file, (base64) => {
          updateConfigProperty('site.logo', base64);
          setInputValue('#site-logo-url', base64);
        });
      }
    });
  }

  // Boutons d'ajout d'éléments
  document.getElementById('btn-add-room')?.addEventListener('click', addRoom);
  document.getElementById('btn-add-restaurant')?.addEventListener('click', addRestaurantItem);
  document.getElementById('btn-add-service')?.addEventListener('click', addService);

  // Rechargement de l'iframe après son chargement initial
  const iframe = document.getElementById('preview-iframe') || document.querySelector('iframe');
  if (iframe) {
    iframe.addEventListener('load', () => updatePreview());
  }
}

/**
 * Rendu de la section d'édition des chambres (avec attributs complets)
 */
function renderRoomsEditor() {
  const container = document.getElementById('rooms-editor-container');
  if (!container) return;

  if (!Array.isArray(currentConfig.rooms)) {
    currentConfig.rooms = [];
  }

  container.innerHTML = currentConfig.rooms.map((room, index) => {
    const images = Array.isArray(room.images) ? room.images : (room.image ? [room.image] : []);
    const amenitiesStr = Array.isArray(room.amenities) ? room.amenities.join(', ') : (room.amenities || '');

    return `
      <div class="customizer-card" data-room-index="${index}">
        <div class="card-header">
          <h4>Chambre #${index + 1} : ${room.name || 'Nouvelle chambre'}</h4>
          <button type="button" class="btn-danger btn-sm" onclick="removeRoom(${index})">Supprimer</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>ID unique :</label>
            <input type="text" value="${room.id || ''}" onchange="updateRoom(${index}, 'id', this.value)" placeholder="ex: room-deluxe" />
          </div>

          <div class="form-group">
            <label>Nom :</label>
            <input type="text" value="${room.name || ''}" onchange="updateRoom(${index}, 'name', this.value)" />
          </div>

          <div class="form-group">
            <label>Prix par nuit (€) :</label>
            <input type="number" value="${room.price || 0}" onchange="updateRoom(${index}, 'price', parseFloat(this.value) || 0)" />
          </div>

          <div class="form-group">
            <label>Capacité (personnes) :</label>
            <input type="number" value="${room.capacity || 2}" onchange="updateRoom(${index}, 'capacity', parseInt(this.value, 10) || 1)" />
          </div>

          <div class="form-group">
            <label>Superficie (m²) :</label>
            <input type="number" value="${room.surface || ''}" onchange="updateRoom(${index}, 'surface', parseFloat(this.value) || 0)" />
          </div>
        </div>

        <div class="form-group">
          <label>Description :</label>
          <textarea rows="2" onchange="updateRoom(${index}, 'description', this.value)">${room.description || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Équipements (séparés par des virgules) :</label>
          <input type="text" value="${amenitiesStr}" onchange="updateRoomAmenities(${index}, this.value)" placeholder="Wi-Fi, Balcon, Climatisation..." />
        </div>

        <div class="form-group">
          <label>Images de la chambre :</label>

          <div class="images-preview-list" id="room-images-${index}">
            ${images.map((imgSrc, imgIdx) => `
              <div class="image-thumb-box">
                <img src="${imgSrc}" class="thumb-img" />
                <button type="button" class="btn-thumb-remove" onclick="removeRoomImage(${index}, ${imgIdx})">×</button>
              </div>
            `).join('')}
          </div>

          <div class="image-add-controls">
            <input type="text" placeholder="URL d'image..." id="room-img-url-${index}" />
            <button type="button" class="btn-secondary btn-sm" onclick="addRoomImageUrl(${index})">Ajouter URL</button>
            <input type="file" accept="image/*" id="room-img-file-${index}" onchange="handleRoomFileUpload(${index}, this)" style="display:none;" />
            <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('room-img-file-${index}').click()">Fichier local</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Mise à jour d'un champ simple d'une chambre
 */
window.updateRoom = function(index, field, value) {
  if (currentConfig.rooms[index]) {
    currentConfig.rooms[index][field] = value;
    saveAndSync();
  }
};

/**
 * Mise à jour des équipements d'une chambre
 */
window.updateRoomAmenities = function(index, value) {
  if (currentConfig.rooms[index]) {
    currentConfig.rooms[index].amenities = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    saveAndSync();
  }
};

/**
 * Ajout d'une URL d'image à une chambre
 */
window.addRoomImageUrl = function(index) {
  const input = document.getElementById(`room-img-url-${index}`);
  if (!input || !input.value.trim()) return;

  if (!Array.isArray(currentConfig.rooms[index].images)) {
    currentConfig.rooms[index].images = [];
  }

  currentConfig.rooms[index].images.push(input.value.trim());
  input.value = '';
  saveAndSync();
  renderRoomsEditor();
};

/**
 * Ajout d'un fichier image local à une chambre
 */
window.handleRoomFileUpload = function(index, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  convertFileToBase64(file, (base64) => {
    if (!Array.isArray(currentConfig.rooms[index].images)) {
      currentConfig.rooms[index].images = [];
    }
    currentConfig.rooms[index].images.push(base64);
    saveAndSync();
    renderRoomsEditor();
  });
};

/**
 * Suppression d'une image d'une chambre
 */
window.removeRoomImage = function(roomIndex, imageIndex) {
  if (currentConfig.rooms[roomIndex] && Array.isArray(currentConfig.rooms[roomIndex].images)) {
    currentConfig.rooms[roomIndex].images.splice(imageIndex, 1);
    saveAndSync();
    renderRoomsEditor();
  }
};

/**
 * Ajout d'une nouvelle chambre
 */
function addRoom() {
  if (!Array.isArray(currentConfig.rooms)) {
    currentConfig.rooms = [];
  }

  const newId = `room-${Date.now()}`;
  currentConfig.rooms.push({
    id: newId,
    name: 'Nouvelle Chambre',
    price: 150,
    capacity: 2,
    surface: 25,
    description: 'Description de la chambre.',
    amenities: ['Wi-Fi', 'Climatisation'],
    images: []
  });

  saveAndSync();
  renderRoomsEditor();
}

/**
 * Suppression d'une chambre
 */
window.removeRoom = function(index) {
  if (confirm('Voulez-vous vraiment supprimer cette chambre ?')) {
    currentConfig.rooms.splice(index, 1);
    saveAndSync();
    renderRoomsEditor();
  }
};

/**
 * Rendu de l'éditeur pour la carte du restaurant
 */
function renderRestaurantEditor() {
  const container = document.getElementById('restaurant-editor-container');
  if (!container) return;

  if (!Array.isArray(currentConfig.restaurant)) {
    currentConfig.restaurant = [];
  }

  container.innerHTML = currentConfig.restaurant.map((item, index) => `
    <div class="customizer-card" data-restaurant-index="${index}">
      <div class="card-header">
        <h4>Plat #${index + 1} : ${item.name || 'Nouveau plat'}</h4>
        <button type="button" class="btn-danger btn-sm" onclick="removeRestaurantItem(${index})">Supprimer</button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Nom :</label>
          <input type="text" value="${item.name || ''}" onchange="updateRestaurantItem(${index}, 'name', this.value)" />
        </div>
        <div class="form-group">
          <label>Prix (€) :</label>
          <input type="number" value="${item.price || 0}" onchange="updateRestaurantItem(${index}, 'price', parseFloat(this.value) || 0)" />
        </div>
        <div class="form-group">
          <label>Catégorie :</label>
          <input type="text" value="${item.category || ''}" onchange="updateRestaurantItem(${index}, 'category', this.value)" placeholder="Entrées, Plats, Desserts..." />
        </div>
        <div class="form-group">
          <label>Image (URL) :</label>
          <input type="text" value="${item.image || ''}" onchange="updateRestaurantItem(${index}, 'image', this.value)" />
        </div>
      </div>
      <div class="form-group">
        <label>Description :</label>
        <textarea rows="2" onchange="updateRestaurantItem(${index}, 'description', this.value)">${item.description || ''}</textarea>
      </div>
    </div>
  `).join('');
}

window.updateRestaurantItem = function(index, field, value) {
  if (currentConfig.restaurant[index]) {
    currentConfig.restaurant[index][field] = value;
    saveAndSync();
  }
};

function addRestaurantItem() {
  if (!Array.isArray(currentConfig.restaurant)) currentConfig.restaurant = [];
  currentConfig.restaurant.push({
    id: `plat-${Date.now()}`,
    name: 'Nouveau Plat',
    price: 25,
    category: 'Plats',
    description: 'Description du plat.',
    image: ''
  });
  saveAndSync();
  renderRestaurantEditor();
}

window.removeRestaurantItem = function(index) {
  currentConfig.restaurant.splice(index, 1);
  saveAndSync();
  renderRestaurantEditor();
};

/**
 * Rendu de l'éditeur pour les services
 */
function renderServicesEditor() {
  const container = document.getElementById('services-editor-container');
  if (!container) return;

  if (!Array.isArray(currentConfig.services)) {
    currentConfig.services = [];
  }

  container.innerHTML = currentConfig.services.map((service, index) => `
    <div class="customizer-card" data-service-index="${index}">
      <div class="card-header">
        <h4>Service #${index + 1} : ${service.name || 'Nouveau service'}</h4>
        <button type="button" class="btn-danger btn-sm" onclick="removeService(${index})">Supprimer</button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Nom :</label>
          <input type="text" value="${service.name || ''}" onchange="updateService(${index}, 'name', this.value)" />
        </div>
        <div class="form-group">
          <label>Prix (€) :</label>
          <input type="number" value="${service.price || 0}" onchange="updateService(${index}, 'price', parseFloat(this.value) || 0)" />
        </div>
        <div class="form-group">
          <label>Image (URL) :</label>
          <input type="text" value="${service.image || ''}" onchange="updateService(${index}, 'image', this.value)" />
        </div>
      </div>
      <div class="form-group">
        <label>Description :</label>
        <textarea rows="2" onchange="updateService(${index}, 'description', this.value)">${service.description || ''}</textarea>
      </div>
    </div>
  `).join('');
}

window.updateService = function(index, field, value) {
  if (currentConfig.services[index]) {
    currentConfig.services[index][field] = value;
    saveAndSync();
  }
};

function addService() {
  if (!Array.isArray(currentConfig.services)) currentConfig.services = [];
  currentConfig.services.push({
    id: `service-${Date.now()}`,
    name: 'Nouveau Service',
    price: 30,
    description: 'Description du service.',
    image: ''
  });
  saveAndSync();
  renderServicesEditor();
}

window.removeService = function(index) {
  currentConfig.services.splice(index, 1);
  saveAndSync();
  renderServicesEditor();
};

/**
 * Met à jour une propriété imbriquée à partir d'une clé sous forme "objet.propriete"
 */
function updateConfigProperty(path, value) {
  const keys = path.split('.');
  let current = currentConfig;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
  saveAndSync();
}

/**
 * Helper d'assignation de valeur d'input
 */
function setInputValue(selector, value) {
  const input = document.querySelector(selector);
  if (input) input.value = value;
}

/**
 * Utilitaire de conversion d'un fichier en Base64
 */
function convertFileToBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => callback(e.target.result);
  reader.readAsDataURL(file);
}