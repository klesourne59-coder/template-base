document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     1. NAVIGATION MOBILE (menu hamburger)
     ============================================================ */
  const navToggle = document.querySelector(".nav-toggle");
  const navList = document.querySelector(".nav-list");
  if (navToggle && navList) {
    navToggle.addEventListener("click", () => {
      const isOpen = navList.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    // Ferme le menu mobile après un clic sur un lien
    navList.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navList.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ============================================================
     2. FILTRES DE LA GALERIE
     ============================================================ */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const galleryItems = document.querySelectorAll(".gallery-item");
  if (filterBtns.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.getAttribute("data-filter");
        galleryItems.forEach((item) => {
          const match = filter === "all" || item.getAttribute("data-category") === filter;
          item.style.display = match ? "" : "none";
        });
      });
    });
  }

  /* ============================================================
     3. LIGHTBOX & CARROUSEL (agrandissement et défilement photo)
     ============================================================ */
  const modal = document.getElementById("lightbox-modal");
  const modalImg = document.getElementById("lightbox-img");
  const closeBtn = document.querySelector(".lightbox-close");

  let currentGalleryImages = [];
  let currentImageIndex = 0;

  function showLightboxImage() {
    if (modalImg && currentGalleryImages.length > 0) {
      modalImg.src = currentGalleryImages[currentImageIndex];
    }
  }

  // Ouverture de la lightbox au clic sur une photo
  document.querySelectorAll(".gallery-item, .gallery-card, .lightbox-trigger").forEach((item) => {
    item.addEventListener("click", () => {
      if (!modal || !modalImg) return;

      // Récupère la liste dans data-images si présente, sinon prend la photo cliquée
      const rawImages = item.getAttribute("data-images");
      if (rawImages) {
        currentGalleryImages = rawImages.split(",").map((img) => img.trim());
      } else {
        const singleImg = item.tagName === "IMG" ? item.src : item.querySelector("img")?.src;
        currentGalleryImages = singleImg ? [singleImg] : [];
      }

      currentImageIndex = 0;
      showLightboxImage();
      modal.classList.add("open");
    });
  });

  // Bouton Précédent
  const prevBtn = document.querySelector(".lightbox-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentGalleryImages.length > 0) {
        currentImageIndex = (currentImageIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
        showLightboxImage();
      }
    });
  }

  // Bouton Suivant
  const nextBtn = document.querySelector(".lightbox-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentGalleryImages.length > 0) {
        currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length;
        showLightboxImage();
      }
    });
  }

  // Fermeture UNIQUEMENT sur le bouton Croix (✕)
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      modal.classList.remove("open");
    });
  }

  // Fermeture avec la touche Échap
  if (modal) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") modal.classList.remove("open");
    });
  }

  /* ============================================================
     4. RÉSERVATION — calcul du tarif + paiement Stripe réel
     ============================================================ */
  const ROOMS = {
    "simple":          { label: "Chambre Simple",          price: 16000 },
    "double":          { label: "Chambre Double",          price: 23000 },
    "familiale":       { label: "Chambre Familiale",       price: 31000 },
    "suite-prestige":  { label: "Suite Prestige",          price: 42000 },
    "suite-familiale": { label: "Suite Familiale",         price: 54000 },
    "suite-royale":    { label: "Suite Royale Étoilée",    price: 75000 },
  };
  const MINIBAR_PRICE = 2500;
  const SPA_PRICE = 9000;

  const form = document.getElementById("reservation-form");
  if (form) {
    const roomSelect = document.getElementById("service-type");
    const checkinInput = document.getElementById("checkin");
    const checkoutInput = document.getElementById("checkout");
    const guestsInput = document.getElementById("guests");
    const minibarCheck = document.getElementById("opt-minibar");
    const spaCheck = document.getElementById("opt-spa");
    const summaryEl = document.getElementById("price-summary");
    const errorEl = document.getElementById("reservation-error");
    const submitBtn = form.querySelector("button[type='submit']");

    const formatEuros = (cents) =>
      (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";

    function nightsBetween() {
      if (!checkinInput.value || !checkoutInput.value) return 0;
      const start = new Date(checkinInput.value);
      const end = new Date(checkoutInput.value);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    }

    function updateSummary() {
      if (!summaryEl) return;
      const room = ROOMS[roomSelect.value];
      const nights = nightsBetween();
      const guests = parseInt(guestsInput.value, 10) || 1;

      if (!room || nights <= 0) {
        summaryEl.textContent = "Sélectionnez une chambre et des dates valides pour voir le tarif estimé.";
        return;
      }

      let total = room.price * nights;
      const lines = [
        `${room.label} × ${nights} nuit${nights > 1 ? "s" : ""} — ${formatEuros(room.price * nights)}`
      ];

      if (minibarCheck && minibarCheck.checked) {
        total += MINIBAR_PRICE * nights;
        lines.push(`Minibar Premium × ${nights} nuit${nights > 1 ? "s" : ""} — ${formatEuros(MINIBAR_PRICE * nights)}`);
      }
      if (spaCheck && spaCheck.checked) {
        total += SPA_PRICE * guests;
        lines.push(`Accès Spa × ${guests} pers. — ${formatEuros(SPA_PRICE * guests)}`);
      }

      lines.push(`<strong>Total estimé — ${formatEuros(total)}</strong>`);
      summaryEl.innerHTML = lines.join("<br>");
    }

    [roomSelect, checkinInput, checkoutInput, guestsInput, minibarCheck, spaCheck]
      .filter(Boolean)
      .forEach((el) => el.addEventListener("input", updateSummary));
    updateSummary();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorEl) {
        errorEl.classList.remove("visible");
        errorEl.textContent = "";
      }

      const roomType = roomSelect.value;
      const dateStart = checkinInput.value;
      const dateEnd = checkoutInput.value;
      const guests = parseInt(guestsInput.value, 10) || 1;
      const name = document.getElementById("res-name").value;
      const email = document.getElementById("res-email").value;

      if (!roomType || !dateStart || !dateEnd || nightsBetween() <= 0) {
        if (errorEl) {
          errorEl.textContent = "Merci de vérifier vos dates : le départ doit être après l'arrivée.";
          errorEl.classList.add("visible");
        }
        return;
      }

      const payload = {
        roomType,
        dateStart,
        dateEnd,
        guests,
        name,
        email,
        options: {
          minibar: !!(minibarCheck && minibarCheck.checked),
          spa: !!(spaCheck && spaCheck.checked),
        },
      };

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Redirection vers le paiement sécurisé…";

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("La session de paiement n'a pas pu être créée.");

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Réponse inattendue du serveur de paiement.");
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = "Une erreur est survenue lors de la préparation du paiement. Merci de réessayer dans un instant, ou de nous contacter directement.";
          errorEl.classList.add("visible");
        }
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }

});
