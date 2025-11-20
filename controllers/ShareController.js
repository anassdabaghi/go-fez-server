// server-go-fez/controllers/ShareController.js

const { Share, sequelize } = require('../models');
const { awardPoints } = require('../services/GamificationService');

/**
 * Enregistre une action de partage et attribue des points.
 * @body { resourceType ('poi' ou 'circuit'), resourceId, platform ('facebook', 'whatsapp', etc.) }
 * @user { userId }
 */
exports.registerShare = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const { resourceType, resourceId, platform } = req.body;
		const userId = req.user.userId; // Supposé provenir de l'auth middleware

		if (!resourceType || !resourceId || !platform) {
			return res.status(400).json({
				success: false,
				message: 'resourceType, resourceId, et platform sont requis.',
			});
		}

		// Enregistrer l'action de partage
		const newShare = await Share.create(
			{
				userId,
				resourceType,
				resourceId,
				platform,
			},
			{ transaction: t }
		);

		// Attribuer des points pour le partage (ne bloque pas la réponse)
		// Nous n'attendons pas (pas de await) pour que la réponse soit rapide.
		awardPoints(userId, 'SHARE_WITH_FRIEND', t).catch((err) => {
			console.error(
				'[ShareController] Erreur lors de l-attribution de points:',
				err
			);
		});

		// Valider la transaction
		await t.commit();

		res.status(201).json({
			success: true,
			message: 'Partage enregistré.',
			data: newShare,
		});
	} catch (error) {
		await t.rollback();
		// Gérer les erreurs, par exemple si l'utilisateur partage trop de fois
		if (error.name === 'SequelizeUniqueConstraintError') {
			return res.status(409).json({
				success: false,
				message: 'Action de partage déjà enregistrée récemment.',
			});
		}
		console.error('Erreur lors de l-enregistrement du partage:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};