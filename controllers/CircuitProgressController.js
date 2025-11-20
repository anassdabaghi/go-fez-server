// server-go-fez/controllers/CircuitProgressController.js

const {
	CircuitProgress,
	Circuit,
	CircuitPOI,
	sequelize,
} = require('../models');
const { CustomCircuit } = require('../models/CustomCircuit');
const { awardCircuitCompletion } = require('../services/GamificationService');

/**
 * Démarrer un circuit pour un utilisateur
 * @body circuitId, circuitType (optional, defaults to "REGULAR")
 * @user userId
 */
exports.startCircuit = async (req, res) => {
	const { circuitId, circuitType = 'REGULAR' } = req.body;
	const userId = req.user.userId; // Supposé provenir de l'auth middleware

	if (!circuitId) {
		return res
			.status(400)
			.json({ success: false, message: 'circuitId est requis.' });
	}

	// Validate circuitType
	if (!['REGULAR', 'CUSTOM'].includes(circuitType)) {
		return res.status(400).json({
			success: false,
			message: 'circuitType doit être "REGULAR" ou "CUSTOM".',
		});
	}

	try {
		// Vérifier si une progression existe déjà
		let progress = await CircuitProgress.findOne({
			where: { userId, circuitId, circuitType },
		});

		if (progress) {
			// Si le circuit est déjà commencé (ou terminé), renvoyer la progression
			return res.status(200).json({
				success: true,
				message: 'Circuit déjà commencé.',
				data: progress,
			});
		}

		// Créer une nouvelle progression
		const newProgress = await CircuitProgress.create({
			userId,
			circuitId,
			circuitType,
			status: 'STARTED',
			currentPOIIndex: 0,
			completedPOIs: [],
			startedAt: new Date(),
		});

		res.status(201).json({
			success: true,
			message: 'Circuit démarré avec succès.',
			data: newProgress,
		});
	} catch (error) {
		console.error('Erreur lors du démarrage du circuit:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Mettre à jour la progression (ex: marquer un POI comme visité)
 * @body circuitId, poiId
 * @user userId
 */
exports.updateCircuitProgress = async (req, res) => {
	const { circuitId, poiId } = req.body;
	const userId = req.user.userId;
	const t = await sequelize.transaction();

	if (!circuitId || !poiId) {
		return res.status(400).json({
			success: false,
			message: 'circuitId et poiId sont requis.',
		});
	}

	try {
		// 1. Trouver la progression en cours
		let progress = await CircuitProgress.findOne({
			where: { userId, circuitId },
			transaction: t,
		});

		if (!progress) {
			return res
				.status(404)
				.json({ success: false, message: 'Progression non trouvée.' });
		}

		if (progress.status === 'COMPLETED') {
			return res
				.status(400)
				.json({ success: false, message: 'Circuit déjà terminé.' });
		}

		// 2. Ajouter le POI aux POIs complétés
		let completedPOIs = Array.isArray(progress.completedPOIs)
			? progress.completedPOIs
			: [];
		if (!completedPOIs.includes(poiId)) {
			completedPOIs.push(poiId);
		}

		// 3. Vérifier si le circuit est terminé
		// (On récupère le nombre total de POIs pour ce circuit)
		let totalPOIs = 0;
		
		if (progress.circuitType === 'CUSTOM') {
			// For custom circuits, get POI count from selectedPOIs
			const customCircuit = await CustomCircuit.findByPk(circuitId, { transaction: t });
			if (customCircuit) {
				const poiIds = Array.isArray(customCircuit.selectedPOIs) 
					? customCircuit.selectedPOIs 
					: JSON.parse(customCircuit.selectedPOIs || '[]');
				totalPOIs = poiIds.length;
			}
		} else {
			// For regular circuits, count from CircuitPOI
			totalPOIs = await CircuitPOI.count({
				where: { circuitId: circuitId },
				transaction: t,
			});
		}

		let newStatus = 'IN_PROGRESS';
		let completedAt = null;
		let totalTime = null;

		if (completedPOIs.length >= totalPOIs) {
			newStatus = 'COMPLETED';
			completedAt = new Date();
			// Calculer le temps total en minutes
			const diffMs = completedAt - progress.startedAt;
			totalTime = Math.round(diffMs / 60000);

			// Award gamification points for circuit completion
			// This function will check circuit type and award milestone bonuses
			const isPremium = progress.circuitType === 'REGULAR' 
				? (await Circuit.findByPk(circuitId, { transaction: t }))?.isPremium || false
				: false;
			
			// Award points asynchronously (don't await to avoid blocking)
			awardCircuitCompletion(userId, circuitId, isPremium).catch(err => 
				console.error('Error awarding circuit completion:', err)
			);
		}

		// 4. Mettre à jour la progression
		const updatedProgress = await progress.update(
			{
				completedPOIs: completedPOIs,
				currentPOIIndex: completedPOIs.length,
				status: newStatus,
				completedAt: completedAt,
				totalTime: totalTime,
			},
			{ transaction: t }
		);

		await t.commit();

		res.status(200).json({
			success: true,
			message: 'Progression mise à jour.',
			data: updatedProgress,
		});
	} catch (error) {
		await t.rollback();
		console.error('Erreur lors de la mise à jour de la progression:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Obtenir la progression d'un circuit spécifique pour l'utilisateur
 * @params circuitId
 * @user userId
 */
exports.getCircuitProgress = async (req, res) => {
	const { circuitId } = req.params;
	const userId = req.user.userId;

	try {
		const progress = await CircuitProgress.findOne({
			where: { userId, circuitId },
		});

		if (!progress) {
			return res
				.status(404)
				.json({ success: false, message: 'Progression non trouvée.' });
		}

		res.status(200).json({ success: true, data: progress });
	} catch (error) {
		console.error('Erreur lors de la récupération de la progression:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Obtenir toutes les progressions de circuits pour l'utilisateur
 * @user userId
 */
exports.getAllUserProgress = async (req, res) => {
	const userId = req.user.userId;

	try {
		const allProgress = await CircuitProgress.findAll({
			where: { userId },
			order: [['updatedAt', 'DESC']],
		});

		res.status(200).json({ success: true, data: allProgress });
	} catch (error) {
		console.error('Erreur lors de la récupération des progressions:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};