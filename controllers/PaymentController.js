// server-go-fez/controllers/PaymentController.js

const { Subscription, User, sequelize } = require('../models');

// --- PLACEHOLDER: Intégration du fournisseur de paiement ---
// Vous devrez installer et configurer le SDK de votre fournisseur
// Exemple (ne fonctionnera pas sans configuration réelle):
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const cmiClient = require('cmi-sdk')(process.env.CMI_API_KEY);

/**
 * Crée une intention de paiement pour un abonnement.
 * @body { plan ('premium', 'pro'), userId? (Admin peut spécifier) }
 * @user { userId, role }
 */
exports.createPaymentIntent = async (req, res) => {
	try {
		const { plan } = req.body;
		const userId = req.body.userId || req.user.userId; // Admin peut spécifier un user
		const requestingUserRole = req.user.role;

		if (req.body.userId && requestingUserRole !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Seul un admin peut créer un paiement pour un autre utilisateur.',
			});
		}

		if (!plan || !['premium', 'pro'].includes(plan)) {
			return res.status(400).json({
				success: false,
				message: 'Plan invalide spécifié (premium ou pro requis).',
			});
		}

		// TODO: Récupérer le prix du plan depuis la configuration ou la base de données
		const amount = plan === 'premium' ? 1000 : 5000; // Exemple: Montant en centimes/piastres
		const currency = 'MAD'; // Ou autre devise

		// --- LOGIQUE SPÉCIFIQUE AU FOURNISSEUR DE PAIEMENT ---
		// Exemple avec Stripe (à adapter pour CMI/SharyPay):
		// const paymentIntent = await stripe.paymentIntents.create({
		//   amount: amount,
		//   currency: currency,
		//   metadata: { userId, plan },
		// });

		// --- PLACEHOLDER ---
		// Simuler une réponse de création d'intention de paiement
		const mockPaymentIntent = {
			id: `pi_${Date.now()}`,
			client_secret: `pi_${Date.now()}_secret_${Math.random()
				.toString(36)
				.substring(7)}`,
			amount: amount,
			currency: currency,
			metadata: { userId, plan },
		};
		// --- FIN PLACEHOLDER ---

		console.log(
			`[Payment] Intention de paiement créée pour ${userId}, plan ${plan}`
		);

		res.status(200).json({
			success: true,
			clientSecret: mockPaymentIntent.client_secret, // Pour le frontend (Stripe)
			paymentIntentId: mockPaymentIntent.id, // Ou autre info nécessaire
			// Adaptez la réponse selon les besoins de CMI/SharyPay
		});
	} catch (error) {
		console.error("Erreur lors de la création de l'intention de paiement:", error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Gère les webhooks entrants du fournisseur de paiement.
 * C'est ici que l'abonnement est activé après un paiement réussi.
 * @body (dépend du fournisseur: contient les détails de l'événement)
 * @headers (peut contenir une signature pour vérification)
 */
exports.handlePaymentWebhook = async (req, res) => {
	const payload = req.body;
	// Exemple: Signature Stripe pour vérification
	// const sig = req.headers['stripe-signature'];
	// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	let event;

	// --- VÉRIFICATION DU WEBHOOK (Très Important!) ---
	try {
		// Exemple Stripe:
		// event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);

		// --- PLACEHOLDER ---
		// Simuler un événement de paiement réussi
		console.log('[Webhook] Webhook reçu (Simulation)');
		if (payload.type === 'simulate_success') {
			event = {
				type: 'payment_intent.succeeded', // Ou l'équivalent CMI/SharyPay
				data: {
					object: {
						id: payload.paymentIntentId || `pi_${Date.now()}`,
						amount: payload.amount || 1000,
						currency: 'mad',
						metadata: {
							userId: payload.userId || 'user_id_placeholder',
							plan: payload.plan || 'premium',
						},
						// ... autres détails du paiement
					},
				},
			};
		} else {
			// Simuler un événement ignoré
			event = { type: 'unknown' };
		}
		// --- FIN PLACEHOLDER ---
	} catch (err) {
		console.error(`[Webhook] Échec de la vérification: ${err.message}`);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	const t = await sequelize.transaction();
	try {
		// Gérer l'événement
		switch (event.type) {
			case 'payment_intent.succeeded': // Adaptez à l'événement de succès de CMI/SharyPay
				const paymentIntent = event.data.object;
				const { userId, plan } = paymentIntent.metadata;

				console.log(
					`[Webhook] Paiement réussi (${paymentIntent.id}) pour ${userId}, plan ${plan}. Mise à jour de l'abonnement...`
				);

				// Trouver ou créer l'abonnement
				let subscription = await Subscription.findOne({
					where: { userId },
					transaction: t,
				});

				const now = new Date();
				const endDate = new Date(now);
				// TODO: Définir la durée de l'abonnement (ex: 1 mois, 1 an)
				endDate.setMonth(endDate.getMonth() + 1); // Exemple: +1 mois

				if (subscription) {
					// Mettre à jour l'abonnement existant
					await subscription.update(
						{
							plan: plan,
							status: 'active',
							startDate: now,
							endDate: endDate,
							paymentProvider: 'placeholder', // Mettez le nom réel
							paymentProviderSubscriptionId: paymentIntent.id, // Ou l'ID pertinent
						},
						{ transaction: t }
					);
				} else {
					// Créer un nouvel abonnement
					await Subscription.create(
						{
							userId: userId,
							plan: plan,
							status: 'active',
							startDate: now,
							endDate: endDate,
							paymentProvider: 'placeholder',
							paymentProviderSubscriptionId: paymentIntent.id,
						},
						{ transaction: t }
					);
				}
				break;

			// TODO: Gérer d'autres événements (échec de paiement, annulation, etc.)
			// case 'invoice.payment_failed':
			//   // ... informer l'utilisateur, marquer l'abonnement comme 'past_due'
			//   break;
			// case 'customer.subscription.deleted':
			//   // ... marquer l'abonnement comme 'canceled' ou 'inactive'
			//   break;

			default:
				console.log(`[Webhook] Événement non géré: ${event.type}`);
		}

		await t.commit();
		// Répondre au fournisseur de paiement que le webhook a été reçu
		res.status(200).json({ received: true });
	} catch (error) {
		await t.rollback();
		console.error('[Webhook] Erreur lors du traitement:', error);
		// Ne pas renvoyer 200 pour que le fournisseur réessaie (si configuré)
		res.status(500).json({ error: 'Erreur interne du serveur.' });
	}
};