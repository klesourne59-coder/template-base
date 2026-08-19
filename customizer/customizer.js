/**
 * Script du Customizer (Gestion du panneau latéral & Synchronisation Iframe)
 */
document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("preview-iframe");
  const saveBtn = document.getElementById("save-btn");
  const saveStatus = document.getElementById("save-status");
  const logoutBtn = document.getElementById("logout-btn");

  // 1. Déconnexion
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("pro_auth");
      window.location.href = "login.html";
    });
  }

  // 2. Synchronisation des sélecteurs de couleur avec leurs champs texte
  const colorPairs = [
    { picker: "color-secondary", hex: "hex-secondary", varName: "--color-secondary" },
    { picker: "color-background", hex: "hex-background", varName: "--color-bg" },
    { picker: "color-card", hex: "hex-card", varName: "--color-card" }
  ];

  colorPairs.forEach(({ picker, hex, varName }) => {
    const pickerEl = document.getElementById(picker);
    const hexEl = document.getElementById(hex);

    if (pickerEl && hexEl) {
      pickerEl.addEventListener("input", (e) => {
        const val = e.target.value;
        hexEl.value = val;
        updateIframeStyle(varName, val);
      });
    }
  });

  // 3. Modification en direct du nom de l'établissement
  const brandInput = document.getElementById("brand-title");
  if (brandInput) {
    brandInput.addEventListener("input", (e) => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const brandEl = iframeDoc.querySelector("h1, .brand-name, header title");
      if (brandEl) brandEl.textContent = e.target.value;
    });
  }

  // 4. Gestion de la mise à jour CSS dans l'iframe
  function updateIframeStyle(varName, value) {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (iframeDoc) {
      iframeDoc.documentElement.style.setProperty(varName, value);
      if (varName === "--color-bg") {
        iframeDoc.body.style.setProperty("background-color", value, "important");
      }
    }
  }

  // 5. Gestion des fichiers d'images (Upload local -> Base64 DataURL)
  const fileInputs = document.querySelectorAll(".file-input");
  fileInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const targetId = input.getAttribute("data-target");
      const urlInput = document.getElementById(targetId);

      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          if (urlInput) urlInput.value = dataUrl;
          applyImageToIframe(targetId, dataUrl);
        };
        reader.readAsDataURL(file);
      }
    });
  });

  function applyImageToIframe(targetId, url) {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return;

    if (targetId === "logo-img-url") {
      const logo = iframeDoc.querySelector("nav img, .logo");
      if (logo) logo.src = url;
    } else if (targetId === "hero-img-url") {
      const heroImg = iframeDoc.getElementById("hero-img") || iframeDoc.querySelector(".hero img");
      if (heroImg) heroImg.src = url;
    } else if (targetId === "dish1-img-url") {
      const dish = iframeDoc.querySelector(".dish-img, #dish1");
      if (dish) dish.src = url;
    }
  }

  // 6. Sauvegarde globale dans le localStorage
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

      if (iframeDoc) {
        // Sauvegarde du HTML complet de la page
        const pagePath = iframe.contentWindow.location.pathname;
        const pageKey = 'page_html_' + pagePath;
        localStorage.setItem(pageKey, iframeDoc.body.innerHTML);

        // Sauvegarde des variables de style
        colorPairs.forEach(({ picker, varName }) => {
          const val = document.getElementById(picker)?.value;
          if (val) localStorage.setItem(varName, val);
        });

        saveStatus.style.color = "#10b981";
        saveStatus.textContent = "Modifications enregistrées avec succès !";
        setTimeout(() => { saveStatus.textContent = ""; }, 3000);
      }
    });
  }
});