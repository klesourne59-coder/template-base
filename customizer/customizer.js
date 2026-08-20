let currentConfig = {};
const iframe = document.getElementById('preview-frame');

fetch('../config.json')
  .then((res) => res.json())
  .then((data) => {
    const saved = localStorage.getItem('site_config_draft');
    currentConfig = saved ? JSON.parse(saved) : data;
    populateFormControls(currentConfig);
    renderRoomsManager();
  })
  .catch((err) => console.error('Erreur chargement config initial :', err));

function syncPreview() {
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { type: 'UPDATE_CONFIG', config: currentConfig },
      '*'
    );
  }
}

function updateField(input) {
  const path = input.getAttribute('data-binding').split('.');
  let obj = currentConfig;

  for (let i = 0; i < path.length - 1; i++) {
    if (!obj[path[i]]) obj[path[i]] = {};
    obj = obj[path[i]];
  }

  obj[path[path.length - 1]] = input.value;
  syncPreview();
}

function uploadImage(fileInput, configPath, previewElemId) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Img = e.target.result;
    const imgPreview = document.getElementById(previewElemId);
    if (imgPreview) imgPreview.src = base64Img;

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

function setViewport(type) {
  const wrapper = document.getElementById('wrapper');
  document.getElementById('btn-desktop').classList.toggle('active', type === 'desktop');
  document.getElementById('btn-mobile').classList.toggle('active', type === 'mobile');
  wrapper.className = type === 'desktop' ? 'viewport-desktop' : 'viewport-mobile';
}

function saveConfig() {
  localStorage.setItem('site_config_draft', JSON.stringify(currentConfig));
  alert('Configuration enregistrée avec succès !');
}

function resetConfig() {
  if (confirm('Voulez-vous réinitialiser toutes vos modifications ?')) {
    localStorage.removeItem('site_config_draft');
    location.reload();
  }
}

async function exportSiteZip() {
  const zip = new JSZip();

  zip.file('config.json', JSON.stringify(currentConfig, null, 2));

  const filesToInclude = [
    'index.html',
    'reservation.html',
    'styles.css',
    'scripts.js',
    'config-loader.js'
  ];

  for (const file of filesToInclude) {
    try {
      const response = await fetch(`../${file}`);
      if (response.ok) {
        const content = await response.text();
        zip.file(file, content);
      }
    } catch (e) {
      console.warn(`Fichier ignoré : ${file}`);
    }
  }

  zip.generateAsync({ type: 'blob' }).then(function (content) {
    saveAs(content, 'mon-site-restau.zip');
  });
}

function renderRoomsManager() {
  const container = document.getElementById('rooms-container');
  if (!container) return;

  container.innerHTML = '';
  if (!currentConfig.rooms) currentConfig.rooms = [];

  currentConfig.rooms.forEach((room, index) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-header">
        <strong>${room.name || 'Chambre'}</strong>
        <button onclick="removeRoom(${index})" class="btn-delete">🗑️</button>
      </div>
      <input type="text" value="${room.name || ''}" oninput="currentConfig.rooms[${index}].name = this.value; syncPreview();" placeholder="Nom">
      <input type="number" value="${room.price || 0}" oninput="currentConfig.rooms[${index}].price = Number(this.value); syncPreview();" placeholder="Prix (€)">
      <textarea oninput="currentConfig.rooms[${index}].description = this.value; syncPreview();" placeholder="Description">${room.description || ''}</textarea>
    `;
    container.appendChild(card);
  });
}

function addRoom() {
  if (!currentConfig.rooms) currentConfig.rooms = [];
  currentConfig.rooms.push({ name: 'Nouvelle Chambre', price: 100, description: '' });
  renderRoomsManager();
  syncPreview();
}

function removeRoom(index) {
  currentConfig.rooms.splice(index, 1);
  renderRoomsManager();
  syncPreview();
}

function populateFormControls(cfg) {
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