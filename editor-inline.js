/**
 * Éditeur Visuel Inline — Version corrigée (Boutons isolés & Site de base)
 */
(function initGlobalBuilder() {
  let editMode = true;

  // 1. Polices Google Fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;600;700&family=Roboto:wght@400;700&display=swap';
  document.head.appendChild(fontLink);

  // 2. CSS de l'éditeur
  const style = document.createElement('style');
  style.textContent = `
    #builder-mode-bar {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000000;
      background: #0f172a;
      border: 1px solid #334155;
      padding: 6px;
      border-radius: 30px;
      display: flex;
      gap: 6px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      font-family: system-ui, sans-serif;
    }
    #builder-mode-bar button {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 14px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    #builder-mode-bar button.active {
      background: #c9a16f;
      color: #000;
    }
    #builder-mode-bar button#btn-reset {
      background: #ef4444;
      color: #ffffff;
    }

    body.editing-active [contenteditable="true"]:hover {
      outline: 2px dashed #c9a16f !important;
      outline-offset: 3px;
      cursor: text !important;
    }

    #wysiwyg-toolbar {
      position: absolute;
      z-index: 999999;
      display: none;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      border: 1px solid #334155;
      padding: 6px 10px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      font-family: system-ui, sans-serif;
    }
    #wysiwyg-toolbar select, 
    #wysiwyg-toolbar button, 
    #wysiwyg-toolbar input[type="color"] {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #475569;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      height: 30px;
    }
    #wysiwyg-toolbar label {
      color: #94a3b8;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 3px;
    }
  `;
  document.head.appendChild(style);

  // 3. Barre de contrôle
  const modeBar = document.createElement('div');
  modeBar.id = 'builder-mode-bar';
  modeBar.innerHTML = `
    <button type="button" id="btn-mode-edit" class="active">✏️ Modifier</button>
    <button type="button" id="btn-mode-nav">🔗 Naviguer</button>
    <button type="button" id="btn-reset">🔄 Remettre le site de base</button>
  `;
  document.body.appendChild(modeBar);

  // 4. Barre d'outils flottante
  const toolbar = document.createElement('div');
  toolbar.id = 'wysiwyg-toolbar';
  toolbar.innerHTML = `
    <select id="tb-font-family">
      <option value="">Police...</option>
      <option value="'Playfair Display', serif">Playfair Display</option>
      <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
      <option value="'Montserrat', sans-serif">Montserrat</option>
      <option value="'Poppins', sans-serif">Poppins</option>
      <option value="Arial, sans-serif">Arial</option>
      <option value="'Roboto', sans-serif">Roboto</option>
    </select>

    <select id="tb-font-size">
      <option value="">Taille texte...</option>
      <option value="14px">14 px</option>
      <option value="16px">16 px</option>
      <option value="20px">20 px</option>
      <option value="28px">28 px</option>
      <option value="36px">36 px</option>
    </select>

    <button type="button" id="tb-bold"><b>B</b></button>

    <label title="Couleur du texte">Texte: <input type="color" id="tb-color" value="#ffffff"></label>
    <label title="Couleur de fond du bloc/bouton">Fond: <input type="color" id="tb-bg-color" value="#c9a16f"></label>

    <select id="tb-btn-size" title="Taille du bouton">
      <option value="">Taille bouton...</option>
      <option value="6px 12px">Petit</option>
      <option value="12px 24px">Moyen</option>
      <option value="18px 36px">Grand</option>
    </select>

    <select id="tb-btn-radius" title="Arrondi du bouton">
      <option value="">Arrondi...</option>
      <option value="0px">Carré</option>
      <option value="6px">Arrondi léger</option>
      <option value="30px">Rond</option>
    </select>
  `;
  document.body.appendChild(toolbar);

  let activeElement = null;

  function positionToolbar(el) {
    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let topPos = rect.top + scrollTop - 50;
    if (rect.top < 60) {
      topPos = rect.bottom + scrollTop + 10;
    }

    toolbar.style.top = `${Math.max(10, topPos)}px`;
    toolbar.style.left = `${Math.max(10, rect.left + scrollLeft)}px`;
    toolbar.style.display = 'flex';
  }

  function hideToolbar() {
    toolbar.style.display = 'none';
    activeElement = null;
  }

  // 5. Modes & Réinitialisation au site de base
  document.getElementById('btn-mode-edit').addEventListener('click', () => {
    editMode = true;
    document.body.classList.add('editing-active');
    document.getElementById('btn-mode-edit').classList.add('active');
    document.getElementById('btn-mode-nav').classList.remove('active');
  });

  document.getElementById('btn-mode-nav').addEventListener('click', () => {
    editMode = false;
    document.body.classList.remove('editing-active');
    document.getElementById('btn-mode-nav').classList.add('active');
    document.getElementById('btn-mode-edit').classList.remove('active');
    hideToolbar();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Revenir au site de base d\'origine ?')) {
      localStorage.clear();
      location.reload();
    }
  });

  // 6. Rendre les éléments éditables
  function makeEverythingEditable() {
    document.body.classList.add('editing-active');
    const selector = 'h1, h2, h3, h4, h5, h6, p, span, a, button, .btn, li, label';
    const elements = document.querySelectorAll(selector);

    elements.forEach((el) => {
      if (el.closest('#wysiwyg-toolbar') || el.closest('#builder-mode-bar') || el.closest('fieldset')) return;

      el.setAttribute('contenteditable', 'true');

      el.addEventListener('click', (e) => {
        if (editMode) {
          e.preventDefault();
          e.stopPropagation();
          activeElement = el;
          positionToolbar(el);
        }
      });

      el.addEventListener('focus', () => {
        if (editMode) {
          activeElement = el;
          positionToolbar(el);
        }
      });

      el.addEventListener('blur', () => saveGlobalState());
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#wysiwyg-toolbar') && !e.target.closest('#builder-mode-bar') && !e.target.isContentEditable) {
      hideToolbar();
    }
  });

  // 7. Actions de la barre d'outils (S'appliquent UNIQUEMENT à l'élément sélectionné)
  document.getElementById('tb-font-family').addEventListener('change', (e) => {
    if (activeElement && e.target.value) { activeElement.style.fontFamily = e.target.value; saveGlobalState(); }
  });

  document.getElementById('tb-font-size').addEventListener('change', (e) => {
    if (activeElement && e.target.value) { activeElement.style.fontSize = e.target.value; saveGlobalState(); }
  });

  document.getElementById('tb-bold').addEventListener('click', () => {
    if (activeElement) {
      const current = window.getComputedStyle(activeElement).fontWeight;
      activeElement.style.fontWeight = (current === '700' || current === 'bold') ? 'normal' : 'bold';
      saveGlobalState();
    }
  });

  document.getElementById('tb-color').addEventListener('input', (e) => {
    if (activeElement) { activeElement.style.color = e.target.value; saveGlobalState(); }
  });

  // Couleur de fond du bouton/bloc sélectionné uniquement (Ne touche PLUS au body)
  document.getElementById('tb-bg-color').addEventListener('input', (e) => {
    if (activeElement) { activeElement.style.backgroundColor = e.target.value; saveGlobalState(); }
  });

  document.getElementById('tb-btn-size').addEventListener('change', (e) => {
    if (activeElement && e.target.value) { activeElement.style.padding = e.target.value; saveGlobalState(); }
  });

  document.getElementById('tb-btn-radius').addEventListener('change', (e) => {
    if (activeElement && e.target.value) { activeElement.style.borderRadius = e.target.value; saveGlobalState(); }
  });

  // 8. Sauvegarde & Restauration
  function saveGlobalState() {
    const pageKey = 'page_html_' + window.location.pathname;
    localStorage.setItem(pageKey, document.body.innerHTML);
  }

  function loadGlobalState() {
    const pageKey = 'page_html_' + window.location.pathname;
    const saved = localStorage.getItem(pageKey);
    if (saved) {
      document.body.innerHTML = saved;
      document.body.appendChild(modeBar);
      document.body.appendChild(toolbar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { loadGlobalState(); makeEverythingEditable(); });
  } else {
    loadGlobalState(); makeEverythingEditable();
  }
})();