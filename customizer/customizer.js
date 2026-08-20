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

// 4. Gestion visuelle des images (Convertit en Base64 pour aperçu immédiat)
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

// 5. Gestionnaire de Chambres (CRUD Visuel)
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
        <button onclick="removeRoom(${index})" class="btn-danger">🗑️ Supprimer</button>
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

function renderAllManagers() {
  renderRoomsManager();
}

// 6. Sauvegarde & Réinitialisation
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

// 7. Exportation du ZIP complet prêt à l'emploi
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