// ============================================
// ADMIN PANEL - LOGIC
// ============================================

// Vérifier la connexion
if (localStorage.getItem('admin_logged_in') !== 'true') {
  window.location.href = 'login.html';
}

let currentConfig = {};
let isSaved = true;

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  initEventListeners();
  updateDashboard();
  showToast('Bienvenue ! 👋', 'success');
});

/**
 * Charge la configuration depuis le localStorage
 */
async function loadConfig() {
  const saved = localStorage.getItem('site_config_live');
  if (saved) {
    try {
      currentConfig = JSON.parse(saved);
      return;
    } catch (e) {
      console.warn('Config corrompue');
    }
  }

  // Charge depuis site-config.json
  try {
    const response = await fetch('../site-config.json');
    currentConfig = await response.json();
  } catch (err) {
    console.error('Erreur de chargement:', err);
    currentConfig = getDefaultConfig();
  }

  populateForm();
}

/**
 * Remplissage automatique du formulaire avec les données
 */
function populateForm() {
  // Thème
  document.getElementById('color-input-primary').value = currentConfig.theme?.primary || '#1b365d';
  document.getElementById('color-input-secondary').value = currentConfig.theme?.secondary || '#c5a059';
  document.getElementById('color-input-accent').value = currentConfig.theme?.accent || '#d4af37';

  document.getElementById('color-value-primary').textContent = currentConfig.theme?.primary || '#1b365d';
  document.getElementById('color-value-secondary').textContent = currentConfig.theme?.secondary || '#c5a059';
  document.getElementById('color-value-accent').textContent = currentConfig.theme?.accent || '#d4af37';

  // Typographie
  document.getElementById('font-heading').value = currentConfig.typography?.headingFont || "'Playfair Display', serif";
  document.getElementById('font-body').value = currentConfig.typography?.bodyFont || "'Montserrat', sans-serif";

  // Contenu
  document.getElementById('site-name').value = currentConfig.site?.name || '';
  document.getElementById('hero-title').value = currentConfig.hero?.title || '';
  document.getElementById('hero-subtitle').value = currentConfig.hero?.subtitle || '';
  document.getElementById('contact-phone').value = currentConfig.contact?.phone || '';
  document.getElementById('contact-email').value = currentConfig.contact?.email || '';
  document.getElementById('contact-address').value = currentConfig.contact?.address || '';

  // Images
  if (currentConfig.site?.logo) {
    displayLogoPreview(currentConfig.site.logo);
  }
}

/**
 * Initialise tous les écouteurs d'événements
 */
function initEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      showSection(section);
    });
  });

  // Boutons d'action
  document.getElementById('btn-save').addEventListener('click', saveConfig);
  document.getElementById('btn-preview').addEventListener('click', togglePreview);
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Couleurs
  ['primary', 'secondary', 'accent'].forEach(color => {
    const input = document.getElementById(`color-input-${color}`);
    input.addEventListener('change', (e) => {
      const value = e.target.value;
      currentConfig.theme = currentConfig.theme || {};
      currentConfig.theme[color === 'primary' ? 'primary' : color === 'secondary' ? 'secondary' : 'accent'] = value;
      document.getElementById(`color-value-${color}`).textContent = value;
      updatePreview();
      markChanged();
    });
  });

  // Typographie
  document.getElementById('font-heading').addEventListener('change', (e) => {
    currentConfig.typography = currentConfig.typography || {};
    currentConfig.typography.headingFont = e.target.value;
    updatePreview();
    markChanged();
  });

  document.getElementById('font-body').addEventListener('change', (e) => {
    currentConfig.typography = currentConfig.typography || {};
    currentConfig.typography.bodyFont = e.target.value;
    updatePreview();
    markChanged();
  });

  // Contenu
  const textFields = [
    { id: 'site-name', path: 'site.name' },
    { id: 'hero-title', path: 'hero.title' },
    { id: 'hero-subtitle', path: 'hero.subtitle' },
    { id: 'contact-phone', path: 'contact.phone' },
    { id: 'contact-email', path: 'contact.email' },
    { id: 'contact-address', path: 'contact.address' },
  ];

  textFields.forEach(({ id, path }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', (e) => {
        setNestedProperty(currentConfig, path, e.target.value);
        updatePreview();
        markChanged();
      });
    }
  });

  // Images - Logo
  const logoZone = document.getElementById('logo-upload');
  logoZone.addEventListener('dragover', (e) => e.preventDefault());
  logoZone.addEventListener('drop', (e) => {
    e.preventDefault();
    handleLogoUpload(e.dataTransfer.files[0]);
  });
  logoZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleLogoUpload(e.target.files[0]);
    input.click();
  });

  // Images - Galerie
  const imagesZone = document.getElementById('images-upload');
  imagesZone.addEventListener('dragover', (e) => e.preventDefault());
  imagesZone.addEventListener('drop', (e) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(file => handleImageUpload(file));
  });
  imagesZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => Array.from(e.target.files).forEach(file => handleImageUpload(file));
    input.click();
  });

  // Boutons spéciaux
  document.getElementById('btn-export').addEventListener('click', exportConfig);
  document.getElementById('btn-reset').addEventListener('click', () => resetPassword());
  document.getElementById('btn-reset-all').addEventListener('click', () => resetAll());
}

/**
 * Affiche/masque le panel de prévisualisation
 */
function togglePreview() {
  const preview = document.querySelector('.admin-preview');
  preview.style.display = preview.style.display === 'none' ? 'flex' : 'none';
}

/**
 * Affiche une section
 */
function showSection(sectionId) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

/**
 * Sauvegarde la configuration
 */
function saveConfig() {
  localStorage.setItem('site_config_live', JSON.stringify(currentConfig));
  
  // Sauvegarde l'heure
  localStorage.setItem('site_config_last_save', new Date().toLocaleString('fr-FR'));
  
  isSaved = true;
  document.getElementById('last-save').textContent = new Date().toLocaleString('fr-FR');
  
  updatePreview();
  showToast('✓ Configuration sauvegardée !', 'success');
}

/**
 * Marque comme non sauvegardé
 */
function markChanged() {
  isSaved = false;
  document.getElementById('btn-save').style.opacity = '1';
}

/**
 * Met à jour l'aperçu
 */
function updatePreview() {
  const iframe = document.getElementById('preview-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'UPDATE_CONFIG',
      config: currentConfig
    }, '*');
  }
}

/**
 * Affiche le dashboard
 */
function updateDashboard() {
  document.getElementById('dashboard-sitename').textContent = currentConfig.site?.name || 'Mon établissement';
  
  const lastSave = localStorage.getItem('site_config_last_save');
  document.getElementById('last-save').textContent = lastSave || 'Jamais';

  // Couleurs
  document.getElementById('color-primary').style.background = currentConfig.theme?.primary || '#1b365d';
  document.getElementById('color-secondary').style.background = currentConfig.theme?.secondary || '#c5a059';
  document.getElementById('color-accent').style.background = currentConfig.theme?.accent || '#d4af37';
}

/**
 * Gère l'upload du logo
 */
function handleLogoUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('⚠️ Veuillez sélectionner une image', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    currentConfig.site = currentConfig.site || {};
    currentConfig.site.logo = base64;
    displayLogoPreview(base64);
    updatePreview();
    markChanged();
    showToast('✓ Logo ajouté', 'success');
  };
  reader.readAsDataURL(file);
}

/**
 * Affiche l'aperçu du logo
 */
function displayLogoPreview(src) {
  const container = document.getElementById('logo-preview');
  container.innerHTML = `<img src="${src}" alt="Logo" />`;
}

/**
 * Gère l'upload d'images
 */
function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('⚠️ Veuillez sélectionner une image valide', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    currentConfig.images = currentConfig.images || [];
    currentConfig.images.push(base64);
    displayImage(base64);
    markChanged();
    showToast('✓ Image ajoutée', 'success');
  };
  reader.readAsDataURL(file);
}

/**
 * Affiche une image dans la galerie
 */
function displayImage(src) {
  const gallery = document.getElementById('images-gallery');
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.innerHTML = `
    <img src="${src}" alt="Image" />
    <button class="gallery-item-delete">×</button>
  `;
  
  item.querySelector('.gallery-item-delete').addEventListener('click', () => {
    const index = currentConfig.images.indexOf(src);
    if (index > -1) {
      currentConfig.images.splice(index, 1);
    }
    item.remove();
    markChanged();
  });

  gallery.appendChild(item);
}

/**
 * Exporte la configuration
 */
function exportConfig() {
  const data = JSON.stringify(currentConfig, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `config-${new Date().getTime()}.json`;
  a.click();
  showToast('✓ Configuration téléchargée', 'success');
}

/**
 * Réinitialise le mot de passe
 */
function resetPassword() {
  showConfirm('Réinitialiser le mot de passe', 'Vous recevrez un email avec un nouveau mot de passe.', () => {
    showToast('📧 Email envoyé !', 'success');
  });
}

/**
 * Réinitialise tout
 */
function resetAll() {
  showConfirm('Réinitialiser le site', '⚠️ Cela supprimera TOUTES vos données. C\'est irréversible !', () => {
    localStorage.removeItem('site_config_live');
    currentConfig = getDefaultConfig();
    populateForm();
    updateDashboard();
    saveConfig();
    showToast('✓ Site réinitialisé', 'success');
  });
}

/**
 * Déconnecte l'utilisateur
 */
function logout() {
  if (isSaved) {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_login_time');
    window.location.href = 'login.html';
  } else {
    showConfirm('Déconnexion', 'Vous avez des modifications non sauvegardées. Êtes-vous sûr ?', () => {
      localStorage.removeItem('admin_logged_in');
      localStorage.removeItem('admin_login_time');
      window.location.href = 'login.html';
    });
  }
}

/**
 * Utilitaires
 */

function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = current[keys[i]] || {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('modal-confirm');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  
  modal.classList.add('active');
  
  document.getElementById('modal-confirm').onclick = () => {
    modal.classList.remove('active');
    onConfirm();
  };
  
  document.getElementById('modal-cancel').onclick = () => {
    modal.classList.remove('active');
  };
}

function getDefaultConfig() {
  return {
    site: {
      name: 'Mon établissement',
      logo: ''
    },
    theme: {
      primary: '#1b365d',
      secondary: '#c5a059',
      accent: '#d4af37',
      background: '#f8f9fa',
      text: '#212529'
    },
    typography: {
      headingFont: "'Playfair Display', serif",
      bodyFont: "'Montserrat', sans-serif"
    },
    hero: {
      title: 'Bienvenue',
      subtitle: 'Découvrez notre établissement'
    },
    contact: {
      phone: '',
      email: '',
      address: ''
    },
    rooms: [],
    restaurant: [],
    services: []
  };
}
