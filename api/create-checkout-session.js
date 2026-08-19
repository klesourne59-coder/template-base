// npm install stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Cette table de tarifs est la SEULE source de vérité pour les prix.
// Le montant réellement débité vient toujours d'ici, jamais d'une valeur
// envoyée par le navigateur (le résumé affiché côté client dans
// scripts.js n'est qu'un aperçu et doit rester synchronisé avec cette liste).
const ROOM_CATALOG = {
  'simple':          { label: 'Chambre Simple',      price: 16000 }, // 160.00 €
  'double':          { label: 'Chambre Double',       price: 23000 }, // 230.00 €
  'familiale':       { label: 'Chambre Familiale',    price: 31000 }, // 310.00 €
  'suite-prestige':  { label: 'Suite Prestige',       price: 42000 }, // 420.00 €
  'suite-familiale': { label: 'Suite Familiale',      price: 54000 }, // 540.00 €
  'suite-royale':    { label: 'Suite Royale Étoilée', price: 75000 }, // 750.00 €
};

const MINIBAR_PRICE = 2500; // 25.00 € / nuit
const SPA_PRICE = 9000;     // 90.00 € / personne

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Méthode non autorisée');
  }

  const { roomType, dateStart, dateEnd, guests, name, email, options = {} } = req.body || {};

  // 1. Validation de la chambre
  const room = ROOM_CATALOG[roomType];
  if (!room) {
    return res.status(400).json({ error: 'Chambre sélectionnée invalide.' });
  }

  // 2. Validation des dates et calcul du nombre de nuits
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (!Number.isFinite(nights) || nights < 1) {
    return res.status(400).json({ error: 'Dates de séjour invalides.' });
  }

  const guestCount = Math.max(1, parseInt(guests, 10) || 1);

  // 3. Construction des lignes de commande Stripe
  const lineItems = [
    {
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Réservation — ${room.label}`,
          description: `Séjour de ${nights} nuit(s) du ${dateStart} au ${dateEnd}`,
        },
        unit_amount: room.price,
      },
      quantity: nights,
    },
  ];

  if (options.minibar) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Option Minibar Premium' },
        unit_amount: MINIBAR_PRICE,
      },
      quantity: nights,
    });
  }

  if (options.spa) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Accès Spa & Soin Massage' },
        unit_amount: SPA_PRICE,
      },
      quantity: guestCount,
    });
  }

  // 4. Création de la session Stripe Checkout.
  // C'est Stripe qui affiche le formulaire de carte bancaire sur sa propre
  // page hébergée : le numéro de carte et le CVV ne transitent jamais par
  // ce serveur ni par le navigateur du client au-delà de ce point.
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: email || undefined,
    metadata: {
      roomType,
      roomLabel: room.label,
      dateStart,
      dateEnd,
      nights: String(nights),
      guests: String(guestCount),
      customerName: name || '',
    },
    success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.origin}/reservation.html`,
  });

  res.status(200).json({ url: session.url });
};
