let currentConfig = {};
const iframe = document.getElementById('preview-frame');

// 1. Initialisation des données depuis site-config.json
fetch('../site-config.json')
  .then((res) => {
    if (!res.ok) throw new Error('Erreur de chargement');
    return res.json();
  })
  .then((defaultConfig) => {
    const saved = localStorage.getItem('site_config_draft');
    currentConfig = saved ? JSON.parse(saved) : defaultConfig;
    bindFormControls(currentConfig);
    renderAllManagers();
  })
  .catch((err) => console.error('Erreur Customizer Init :', err));

// 2. Synchronisation instantanée avec le vrai site (iframe)
function syncPreview() {
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { type: 'UPDATE_CONFIG', config: currentConfig },
      '*'
    );
  }
}

// 3. Mise à jour générique des champs
function updateField(input) {
  const path = input.getAttribute('data-binding').split('.');
  let obj = currentConfig;

  for (let i = 0; i < path.length - 1; i++) {
    if (!obj[path[i]]) obj[path[i]] = {};
    obj = obj[path[i]];
  }

  const val = input.type === 'number' || input.type === 'range' ? Number(input.value) : input.value;
  obj[path[path.length - 1]] = val;
  syncPreview();
}

// 4. Gestion visuelle des images (Base64)
function handleImageUpload(fileInput, configPath, previewElemId) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Img = e.target.result;
    if (previewElemId) {
      const imgPreview = document.getElementById(previewElemId);
      if (imgPreview) imgPreview.src = base64Img;
    }

    const path = configPath.split('.');
    let obj = currentConfig;
    for (let i = 0; i < path.length - 1; i++) {
      if (!obj[path[i]]) obj[path[i]] = {};
      obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = base64Img;

    syncPreview();
  };
  reader.readAsDataURL(file);
}

// 5. GESTIONNAIRE DES CHAMBRES (CRUD)
function renderRoomsManager() {
  const container = document.getElementById('rooms-manager-container');
  if (!container) return;

  container.innerHTML = '';
  if (!currentConfig.rooms) currentConfig.rooms = [];

  currentConfig.rooms.forEach((room, index) => {
    const card = document.createElement('div');
    card.className = 'crud-card';
    card.innerHTML = `
      <div class="crud-header">
        <strong>${room.name || 'Nouvelle Chambre'}</strong>
        <button onclick="removeRoom(${index})" class="btn-danger">Supprimer</button>
      </div>
      <div class="crud-body">
        <label>Nom de la chambre</label>
        <input type="text" value="${room.name || ''}" oninput="currentConfig.rooms[${index}].name = this.value; syncPreview();">

        <label>Prix par nuit (€)</label>
        <input type="number" value="${room.pricePerNight || 0}" oninput="currentConfig.rooms[${index}].pricePerNight = Number(this.value); syncPreview();">

        <div class="row-2">
          <div>
            <label>Capacité (pers.)</label>
            <input type="number" value="${room.capacity || 2}" oninput="currentConfig.rooms[${index}].capacity = Number(this.value); syncPreview();">
          </div>
          <div>
            <label>Surface (m²)</label>
            <input type="number" value="${room.surface || 20}" oninput="currentConfig.rooms[${index}].surface = Number(this.value); syncPreview();">
          </div>
        </div>

        <label>Description</label>
        <textarea oninput="currentConfig.rooms[${index}].description = this.value; syncPreview();">${room.description || ''}</textarea>

        <label>Photo Principale</label>
        <div class="image-uploader-inline">
          <img src="${(room.images && room.images[0]) ? room.images[0] : ''}" id="room-img-preview-${index}" class="thumb-preview">
          <input type="file" accept="image/*" onchange="uploadRoomImage(this, ${index})">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function addRoom() {
  if (!currentConfig.rooms) currentConfig.rooms = [];
  currentConfig.rooms.push({
    id: 'room-' + Date.now(),
    name: 'Nouvelle Chambre',
    pricePerNight: 150,
    capacity: 2,
    surface: 25,
    description: '',
    amenities: ['Wi-Fi'],
    images: []
  });
  renderRoomsManager();
  syncPreview();
}

function removeRoom(index) {
  currentConfig.rooms.splice(index, 1);
  renderRoomsManager();
  syncPreview();
}

function uploadRoomImage(fileInput, index) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    if (!currentConfig.rooms[index].images) currentConfig.rooms[index].images = [];
    currentConfig.rooms[index].images[0] = e.target.result;
    const preview = document.getElementById(`room-img-preview-${index}`);
    if (preview) preview.src = e.target.result;
    syncPreview();
  };
  reader.readAsDataURL(file);
}

// 6. GESTIONNAIRE DU RESTAURANT (CRUD)
function renderRestaurantManager() {
  const container = document.getElementById('restaurant-manager-container');
  if (!container) return;

  container.innerHTML = '';
  if (!currentConfig.restaurant) currentConfig.restaurant = [];

  currentConfig.restaurant.forEach((cat, catIndex) => {
    const catCard = document.createElement('div');
    catCard.className = 'crud-card';
    catCard.innerHTML = `
      <div class="crud-header">
        <input type="text" value="${cat.category || ''}" placeholder="Nom de la catégorie (ex: Entrées)" oninput="currentConfig.restaurant[${catIndex}].category = this.value; syncPreview();" style="font-weight: bold; font-size: 1rem;">
        <button onclick="removeRestaurantCategory(${catIndex})" class="btn-danger">Supprimer catégorie</button>
      </div>
      <div class="crud-body">
        <div id="items-cat-${catIndex}" class="crud-list">
          ${(cat.items || []).map((item, itemIndex) => `
            <div class="crud-card" style="background: #f8fafc; border-style: dashed; margin-top: 8px;">
              <div class="crud-header">
                <strong>${item.name || 'Nouveau plat'}</strong>
                <button onclick="removeRestaurantItem(${catIndex}, ${itemIndex})" class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">Supprimer plat</button>
              </div>
              <div class="crud-body">
                <label>Nom du plat</label>
                <input type="text" value="${item.name || ''}" oninput="currentConfig.restaurant[${catIndex}].items[${itemIndex}].name = this.value; syncPreview();">

                <div class="row-2">
                  <div>
                    <label>Prix (€)</label>
                    <input type="number" value="${item.price || 0}" oninput="currentConfig.restaurant[${catIndex}].items[${itemIndex}].price = Number(this.value); syncPreview();">
                  </div>
                  <div>
                    <label>Photo du plat</label>
                    <div class="image-uploader-inline">
                      <img src="${item.image || ''}" id="rest-img-preview-${catIndex}-${itemIndex}" class="thumb-preview mini">
                      <input type="file" accept="image/*" onchange="uploadRestaurantImage(this, ${catIndex}, ${itemIndex})">
                    </div>
                  </div>
                </div>

                <label>Description</label>
                <textarea rows="2" oninput="currentConfig.restaurant[${catIndex}].items[${itemIndex}].description = this.value; syncPreview();">${item.description || ''}</textarea>
              </div>
            </div>
          `).join('')}
        </div>
        <button onclick="addRestaurantItem(${catIndex})" class="btn-secondary" style="width: 100%; margin-top: 10px;">+ Ajouter un plat à ${cat.category || 'cette catégorie'}</button>
      </div>
    `;
    container.appendChild(catCard);
  });

  const addCatBtn = document.createElement('button');
  addCatBtn.className = 'btn-primary';
  addCatBtn.style.marginTop = '12px';
  addCatBtn.innerText = '+ Ajouter une catégorie de menu';
  addCatBtn.onclick = addRestaurantCategory;
  container.appendChild(addCatBtn);
}

function addRestaurantCategory() {
  if (!currentConfig.restaurant) currentConfig.restaurant = [];
  currentConfig.restaurant.push({
    category: 'Nouvelle Catégorie',
    items: []
  });
  renderRestaurantManager();
  syncPreview();
}

function removeRestaurantCategory(catIndex) {
  currentConfig.restaurant.splice(catIndex, 1);
  renderRestaurantManager();
  syncPreview();
}

function addRestaurantItem(catIndex) {
  if (!currentConfig.restaurant[catIndex].items) currentConfig.restaurant[catIndex].items = [];
  currentConfig.restaurant[catIndex].items.push({
    id: 'rest-' + Date.now(),
    name: 'Nouveau plat',
    description: '',
    price: 18,
    image: ''
  });
  renderRestaurantManager();
  syncPreview();
}

function removeRestaurantItem(catIndex, itemIndex) {
  currentConfig.restaurant[catIndex].items.splice(itemIndex, 1);
  renderRestaurantManager();
  syncPreview();
}

function uploadRestaurantImage(fileInput, catIndex, itemIndex) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    currentConfig.restaurant[catIndex].items[itemIndex].image = e.target.result;
    const preview = document.getElementById(`rest-img-preview-${catIndex}-${itemIndex}`);
    if (preview) preview.src = e.target.result;
    syncPreview();
  };
  reader.readAsDataURL(file);
}

// 7. GESTIONNAIRE DES SERVICES (CRUD)
function renderServicesManager() {
  const container = document.getElementById('services-manager-container');
  if (!container) return;

  container.innerHTML = '';
  if (!currentConfig.services) currentConfig.services = [];

  currentConfig.services.forEach((serv, index) => {
    const card = document.createElement('div');
    card.className = 'crud-card';
    card.innerHTML = `
      <div class="crud-header">
        <strong>${serv.name || 'Nouveau Service'}</strong>
        <button onclick="removeService(${index})" class="btn-danger">Supprimer</button>
      </div>
      <div class="crud-body">
        <label>Nom du service</label>
        <input type="text" value="${serv.name || ''}" oninput="currentConfig.services[${index}].name = this.value; syncPreview();">

        <div class="row-2">
          <div>
            <label>Prix (€)</label>
            <input type="number" value="${serv.price || 0}" oninput="currentConfig.services[${index}].price = Number(this.value); syncPreview();">
          </div>
          <div>
            <label>Photo</label>
            <div class="image-uploader-inline">
              <img src="${serv.image || ''}" id="serv-img-preview-${index}" class="thumb-preview mini">
              <input type="file" accept="image/*" onchange="uploadServiceImage(this, ${index})">
            </div>
          </div>
        </div>

        <label>Description</label>
        <textarea rows="2" oninput="currentConfig.services[${index}].description = this.value; syncPreview();">${serv.description || ''}</textarea>
      </div>
    `;
    container.appendChild(card);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-primary';
  addBtn.style.marginTop = '12px';
  addBtn.innerText = '+ Ajouter un service';
  addBtn.onclick = addService;
  container.appendChild(addBtn);
}

function addService() {
  if (!currentConfig.services) currentConfig.services = [];
  currentConfig.services.push({
    id: 'serv-' + Date.now(),
    name: 'Nouveau service',
    description: '',
    price: 35,
    image: ''
  });
  renderServicesManager();
  syncPreview();
}

function removeService(index) {
  currentConfig.services.splice(index, 1);
  renderServicesManager();
  syncPreview();
}

function uploadServiceImage(fileInput, index) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    currentConfig.services[index].image = e.target.result;
    const preview = document.getElementById(`serv-img-preview-${index}`);
    if (preview) preview.src = e.target.result;
    syncPreview();
  };
  reader.readAsDataURL(file);
}

// 8. EXECUTION GLOBALE DE RENDU
function renderAllManagers() {
  renderRoomsManager();
  renderRestaurantManager();
  renderServicesManager();
}

// 9. SAUVEGARDE, REINITIALISATION & EXPORT
function saveConfig() {
  localStorage.setItem('site_config_draft', JSON.stringify(currentConfig));
  alert('Configuration enregistrée avec succès dans le navigateur !');
}

function resetConfig() {
  if (confirm('Voulez-vous réinitialiser toutes vos modifications et revenir au modèle d\'origine ?')) {
    localStorage.removeItem('site_config_draft');
    location.reload();
  }
}

async function exportSiteZip() {
  if (typeof JSZip === 'undefined') {
    alert('Erreur: La bibliothèque JSZip n\'est pas disponible.');
    return;
  }

  const zip = new JSZip();

  // Injecte la source de vérité unifiée
  zip.file('site-config.json', JSON.stringify(currentConfig, null, 2));

  // Fichiers du site à inclure dans l'archive
  const filesToInclude = [
    'index.html',
    'reservation.html',
    'styles.css',
    'scripts.js',
    'config-loader.js',
    'favicon.ico'
  ];

  for (const file of filesToInclude) {
    try {
      const response = await fetch(`../${file}`);
      if (response.ok) {
        const content = await response.text();
        zip.file(file, content);
      }
    } catch (e) {
      console.warn(`Fichier omis lors de l'exportation : ${file}`);
    }
  }

  zip.generateAsync({ type: 'blob' }).then(function (blobContent) {
    saveAs(blobContent, 'mon-site-restau-complet.zip');
  });
}

function bindFormControls(cfg) {
  document.querySelectorAll('[data-binding]').forEach((el) => {
    const path = el.getAttribute('data-binding').split('.');
    let val = cfg;
    path.forEach((k) => {
      val = val ? val[k] : '';
    });
    if (val !== undefined) el.value = val;
  });
}

iframe.onload = () => syncPreview();