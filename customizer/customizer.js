// customizer/customizer.js — Code complet et corrigé

let currentConfig = {};

// 1. Initialisation globale au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialConfig();
  bindStaticInputs();
  renderAllCollections();
  setupAddButtons();

  const iframe = document.getElementById('preview-iframe');
  if (iframe) {
    iframe.addEventListener('load', () => notifyPreview());
  }
});

/**
 * Charge la configuration depuis localStorage ou ../site-config.json
 */
async function loadInitialConfig() {
  const localData = localStorage.getItem('site_config_live');
  if (localData) {
    try {
      currentConfig = JSON.parse(localData);
      return;
    } catch (e) {
      console.warn('LocalStorage invalide, rechargement du fichier d’origine.');
    }
  }

  try {
    const res = await fetch('../site-config.json');
    if (res.ok) {
      currentConfig = await res.json();
    }
  } catch (err) {
    console.error('Erreur lors du chargement de site-config.json :', err);
  }
}

/**
 * Met à jour le localStorage et envoie la nouvelle config à l'iframe en direct
 */
function notifyPreview() {
  localStorage.setItem('site_config_live', JSON.stringify(currentConfig));

  const iframe = document.getElementById('preview-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { type: 'UPDATE_CONFIG', config: currentConfig },
      '*'
    );
  }
}

/**
 * Lie les champs simples (data-field) et le champ d'import de logo
 */
function bindStaticInputs() {
  document.querySelectorAll('[data-field]').forEach(input => {
    const path = input.getAttribute('data-field');
    const value = getNestedValue(currentConfig, path);
    if (value !== undefined && value !== null) {
      input.value = value;
    }

    input.addEventListener('input', (e) => {
      setNestedValue(currentConfig, path, e.target.value);
      notifyPreview();
    });
  });

  const logoInput = document.getElementById('site-logo-input');
  if (logoInput) {
    logoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        setNestedValue(currentConfig, 'site.logo', event.target.result);
        notifyPreview();
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Génère le rendu de toutes les collections (chambres, restaurant, services)
 */
function renderAllCollections() {
  renderCollection('rooms', '#rooms-container', createCollectionItemHTML);
  renderCollection('restaurant', '#restaurant-container', createCollectionItemHTML);
  renderCollection('services', '#services-container', createCollectionItemHTML);
}

/**
 * Rendu dynamique d'une liste
 */
function renderCollection(key, containerSelector, templateFn) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (!Array.isArray(currentConfig[key])) {
    currentConfig[key] = [];
  }

  container.innerHTML = currentConfig[key].map((item, index) => templateFn(key, item, index)).join('');
  attachCollectionEvents(key, containerSelector);
}

/**
 * HTML d'une carte d'élément
 */
function createCollectionItemHTML(key, item, index) {
  return `
    <div class="item-card" data-key="${key}" data-index="${index}" style="border: 1px solid #cbd5e1; padding: 1rem; margin-bottom: 1rem; border-radius: 6px; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <strong>Élément #${index + 1}</strong>
        <button type="button" class="btn-delete" data-key="${key}" data-index="${index}" style="color: #ef4444; background: none; border: none; cursor: pointer; font-weight: bold;">Supprimer</button>
      </div>

      <div class="form-group" style="margin-bottom: 0.5rem;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600;">Nom :</label>
        <input type="text" class="item-input" data-prop="name" value="${item.name || ''}" style="width: 100%; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;" />
      </div>

      <div class="form-group" style="margin-bottom: 0.5rem;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600;">Prix (€) :</label>
        <input type="number" class="item-input" data-prop="price" value="${item.price ?? ''}" style="width: 100%; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;" />
      </div>

      <div class="form-group" style="margin-bottom: 0.5rem;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600;">Description :</label>
        <textarea class="item-input" data-prop="description" rows="2" style="width: 100%; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px;">${item.description || ''}</textarea>
      </div>

      <div class="form-group">
        <label style="display: block; font-size: 0.8rem; font-weight: 600;">Image :</label>
        <input type="file" class="item-file" data-key="${key}" data-index="${index}" accept="image/*" style="font-size: 0.8rem;" />
        ${item.image ? `<img src="${item.image}" alt="Aperçu" style="max-height: 50px; display: block; margin-top: 5px; border-radius: 4px;" />` : ''}
      </div>
    </div>
  `;
}

/**
 * Attache la saisie, l'upload d'image et la suppression sur les éléments
 */
function attachCollectionEvents(key, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.querySelectorAll('.item-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const card = e.target.closest('.item-card');
      const index = parseInt(card.dataset.index, 10);
      const prop = e.target.dataset.prop;
      const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;

      currentConfig[key][index][prop] = value;
      notifyPreview();
    });
  });

  container.querySelectorAll('.item-file').forEach(fileInput => {
    fileInput.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        currentConfig[key][index].image = event.target.result;
        renderCollection(key, containerSelector, createCollectionItemHTML);
        notifyPreview();
      };
      reader.readAsDataURL(file);
    });
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      currentConfig[key].splice(index, 1);
      renderCollection(key, containerSelector, createCollectionItemHTML);
      notifyPreview();
    });
  });
}

/**
 * Configure les boutons d'ajout
 */
function setupAddButtons() {
  const mappings = [
    { btnId: 'btn-add-room', key: 'rooms', container: '#rooms-container' },
    { btnId: 'btn-add-restaurant', key: 'restaurant', container: '#restaurant-container' },
    { btnId: 'btn-add-service', key: 'services', container: '#services-container' }
  ];

  mappings.forEach(({ btnId, key, container }) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!Array.isArray(currentConfig[key])) {
        currentConfig[key] = [];
      }

      const label = key === 'rooms' ? 'hébergement' : key === 'restaurant' ? 'plat' : 'service';
      currentConfig[key].push({
        id: `${key}-${Date.now()}`,
        name: `Nouveau ${label}`,
        price: 0,
        description: '',
        image: ''
      });

      renderCollection(key, container, createCollectionItemHTML);
      notifyPreview();
    });
  });
}

/**
 * Enregistre explicitement dans localStorage
 */
function saveConfig() {
  try {
    localStorage.setItem('site_config_live', JSON.stringify(currentConfig));
    notifyPreview();
    alert('Configuration enregistrée !');
  } catch (err) {
    console.error('Erreur lors de la sauvegarde :', err);
    alert('Impossible de sauvegarder.');
  }
}

/**
 * Réinitialise tout depuis site-config.json
 */
async function resetConfig() {
  if (!confirm('Voulez-vous vraiment réinitialiser toutes vos modifications ?')) return;

  try {
    localStorage.removeItem('site_config_live');
    const res = await fetch('../site-config.json');
    if (!res.ok) throw new Error(`Erreur HTTP : ${res.status}`);

    currentConfig = await res.json();
    bindStaticInputs();
    renderAllCollections();
    notifyPreview();
    alert('Configuration réinitialisée.');
  } catch (err) {
    console.error('Erreur lors de la réinitialisation :', err);
    alert('Impossible de réinitialiser la configuration.');
  }
}

// Expositions globales pour les onclick du HTML
window.saveConfig = saveConfig;
window.resetConfig = resetConfig;

// Lecture/écriture dans les objets imbriqués ("site.name")
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!curr[parts[i]]) curr[parts[i]] = {};
    curr = curr[parts[i]];
  }
  curr[parts[parts.length - 1]] = value;
}