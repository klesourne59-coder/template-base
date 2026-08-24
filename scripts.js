// scripts.js — Engine de réservation & calcul dynamique de séjour

document.addEventListener('DOMContentLoaded', () => {
  initReservationEngine();
});

// Recalcule si la configuration dynamique est appliquée ou mise à jour
document.addEventListener('siteConfigApplied', () => {
  calculateTotal();
});

/**
 * Initialise les écouteurs du formulaire de réservation
 */
function initReservationEngine() {
  const roomSelect = document.querySelector('select#room-select, select[name="room"]');
  const checkinInput = document.querySelector('#checkin, input[name="checkin"]');
  const checkoutInput = document.querySelector('#checkout, input[name="checkout"]');
  const guestsInput = document.querySelector('#guests, select[name="guests"]');
  const optionInputs = document.querySelectorAll('.reservation-option, input[type="checkbox"][data-price]');
  const form = document.querySelector('#reservation-form, form.booking-form');

  if (!roomSelect && !form) return;

  // Définition de la date minimale à aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  if (checkinInput && !checkinInput.value) {
    checkinInput.min = today;
  }

  // Écoute de tous les champs impactant le prix ou la durée
  const inputsToListen = [roomSelect, checkinInput, checkoutInput, guestsInput, ...optionInputs];
  inputsToListen.forEach(input => {
    if (input) {
      input.addEventListener('change', () => {
        if (input === checkinInput && checkinInput.value) {
          // Ajuste le check-out minimum au lendemain
          const minCheckout = new Date(checkinInput.value);
          minCheckout.setDate(minCheckout.getDate() + 1);
          const minCheckoutStr = minCheckout.toISOString().split('T')[0];
          if (checkoutInput) {
            checkoutInput.min = minCheckoutStr;
            if (!checkoutInput.value || checkoutInput.value <= checkinInput.value) {
              checkoutInput.value = minCheckoutStr;
            }
          }
        }
        calculateTotal();
      });
    }
  });

  // Gestion de la soumission du formulaire
  if (form) {
    form.addEventListener('submit', handleReservationSubmit);
  }

  // Premier calcul au chargement
  calculateTotal();
}

/**
 * Calcule dynamiquement le tarif total à partir des données de site-config.json
 */
function calculateTotal() {
  const roomSelect = document.querySelector('select#room-select, select[name="room"]');
  const checkinInput = document.querySelector('#checkin, input[name="checkin"]');
  const checkoutInput = document.querySelector('#checkout, input[name="checkout"]');
  const optionInputs = document.querySelectorAll('.reservation-option:checked, input[type="checkbox"][data-price]:checked');

  // Éléments de synthèse dans l'interface
  const nightsEl = document.querySelector('#summary-nights, [data-summary="nights"]');
  const roomPriceEl = document.querySelector('#summary-room-price, [data-summary="room-price"]');
  const totalEl = document.querySelector('#summary-total, [data-summary="total"]');
  const submitBtn = document.querySelector('#btn-submit-booking, form button[type="submit"]');

  if (!roomSelect) return null;

  // 1. Récupération du prix de la chambre depuis siteConfig ou data-price
  const selectedValue = roomSelect.value;
  let roomPrice = 0;
  let roomData = null;

  if (window.siteConfig && Array.isArray(window.siteConfig.rooms)) {
    roomData = window.siteConfig.rooms.find(r => r.id === selectedValue || r.name === selectedValue);
    if (roomData) {
      roomPrice = parseFloat(roomData.price) || 0;
    }
  }

  // Fallback sur le dataset de l'option <option data-price="...">
  if (!roomPrice && roomSelect.selectedIndex >= 0) {
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    roomPrice = parseFloat(selectedOption?.dataset?.price) || 0;
  }

  // 2. Calcul du nombre de nuits
  let nights = 0;
  if (checkinInput && checkoutInput && checkinInput.value && checkoutInput.value) {
    const d1 = new Date(checkinInput.value);
    const d2 = new Date(checkoutInput.value);
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime > 0) {
      nights = Math.ceil(diffTime / (1000 * 3600 * 24));
    }
  }

  // 3. Calcul des options supplémentaires (ex: petit-déjeuner, spa)
  let optionsTotal = 0;
  optionInputs.forEach(opt => {
    const optPrice = parseFloat(opt.dataset.price) || 0;
    const optPerNight = opt.dataset.perNight === 'true';
    optionsTotal += optPerNight ? (optPrice * (nights || 1)) : optPrice;
  });

  // 4. Montant global
  const roomTotal = roomPrice * nights;
  const grandTotal = roomTotal + optionsTotal;

  // 5. Mise à jour du DOM
  if (nightsEl) nightsEl.textContent = `${nights} nuit${nights > 1 ? 's' : ''}`;
  if (roomPriceEl) roomPriceEl.textContent = `${roomPrice} €`;
  if (totalEl) totalEl.textContent = `${grandTotal.toFixed(2)} €`;

  if (submitBtn) {
    submitBtn.disabled = !(selectedValue && nights > 0);
  }

  return {
    roomData,
    roomPrice,
    nights,
    optionsTotal,
    grandTotal
  };
}

/**
 * Enregistre la réservation et redirige vers le paiement / confirmation
 */
function handleReservationSubmit(e) {
  e.preventDefault();

  const calculation = calculateTotal();
  if (!calculation || calculation.nights <= 0) {
    alert('Veuillez sélectionner une chambre et des dates valides.');
    return;
  }

  const form = e.target;
  const formData = new FormData(form);

  const reservationSummary = {
    roomId: calculation.roomData?.id || formData.get('room'),
    roomName: calculation.roomData?.name || 'Chambre',
    roomPrice: calculation.roomPrice,
    checkin: formData.get('checkin'),
    checkout: formData.get('checkout'),
    nights: calculation.nights,
    guests: formData.get('guests') || 1,
    optionsTotal: calculation.optionsTotal,
    total: calculation.grandTotal,
    timestamp: new Date().toISOString()
  };

  // Stockage pour le récapitulatif / module de paiement
  localStorage.setItem('current_reservation', JSON.stringify(reservationSummary));

  if (form.dataset.nextStep) {
    window.location.href = form.dataset.nextStep;
  } else {
    alert(`Réservation confirmée pour ${calculation.roomData?.name || 'votre chambre'} !\nTotal : ${calculation.grandTotal.toFixed(2)} € pour ${calculation.nights} nuit(s).`);
  }
}