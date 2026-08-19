// npm install stripe resend
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Méthode non autorisée');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Vérification de la signature Stripe pour des raisons de sécurité
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Erreur Webhook : ${err.message}`);
  }

  // Événement déclenché lorsque le paiement est validé
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata || {};
    const customerEmail = session.customer_details.email;
    const customerName = meta.customerName || session.customer_details.name || 'Cher client';
    const nightsNum = parseInt(meta.nights, 10) || 0;

    const sejourDetails = meta.roomLabel
      ? `<p><strong>Chambre :</strong> ${meta.roomLabel}</p>
         <p><strong>Séjour :</strong> du ${meta.dateStart} au ${meta.dateEnd} (${nightsNum} nuit${nightsNum > 1 ? 's' : ''})</p>`
      : '';

    // Envoi de l'email automatique au client
    await resend.emails.send({
      from: 'Le Jardin Étoilé <reservation@lejardinetoile.fr>',
      to: [customerEmail],
      subject: 'Confirmation de votre réservation — Le Jardin Étoilé',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Bonjour ${customerName},</h2>
          <p>Nous avons le plaisir de vous confirmer la bonne réception de votre réservation.</p>
          ${sejourDetails}
          <p><strong>Montant réglé :</strong> ${(session.amount_total / 100).toFixed(2)} €</p>
          <p>Notre équipe prépare votre arrivée avec le plus grand soin.</p>
          <br />
          <p>À très bientôt,</p>
          <p><strong>L'équipe du Jardin Étoilé</strong></p>
        </div>
      `
    });
  }

  res.status(200).json({ received: true });
};
