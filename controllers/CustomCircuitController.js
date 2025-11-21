// server-go-fez/controllers/CustomCircuitController.js

const { CustomCircuit, POI, POILocalization, POIFile } = require('../models');
const xss = require('xss');

/**
 * Créer un nouveau circuit personnalisé
 * @body { name, description?, pois: [{ poiId, order }] }
 * @user { userId }
 */
exports.createCustomCircuit = async (req, res) => {
	try {
		// --- DÉBUT DE LA CORRECTION ---
		// 1. Accepter 'pois' et 'description' (envoyés par le front-end)
		const { name, description, pois } = req.body;
		
		// TESTING MODE: Use a test userId if not authenticated
		const userId = req.user?.userId || 1; // Fallback to user ID 1 for testing

		// 2. Valider 'pois' et 'name'
		if (!name || !pois || !Array.isArray(pois) || pois.length < 2) {
			return res.status(400).json({
				success: false,
				message: 'Le nom et un tableau of 2 POIs minimum sont requis.',
			});
		}

		// 3. Transformer le tableau 'pois' (objets) en 'selectedPoiIds' (strings)
		//    pour correspondre au modèle de base de données (CustomCircuit.js)
		const selectedPoiIds = pois
			.sort((a, b) => a.order - b.order) // Assurer l'ordre
			.map((p) => p.poiId); // Extraire uniquement les IDs

		// 4. Créer l'objet pour la base de données
		const newCircuit = await CustomCircuit.create({
			userId,
			name: xss(name),
			description: description ? xss(description) : null, // 5. Ajouter la description
			selectedPOIs: selectedPoiIds, // 6. Enregistrer le tableau d'IDs
			isPublic: false, // Mettre 'false' par défaut
		});
		// --- FIN DE LA CORRECTION ---

		res.status(201).json({
			success: true,
			message: 'Circuit personnalisé créé avec succès.',
			data: newCircuit,
		});
	} catch (error) {
		console.error(
			'Erreur lors de la création du circuit personnalisé:',
			error
		);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Récupérer tous les circuits personnalisés de l'utilisateur connecté
 * @user { userId }
 */
exports.getUserCustomCircuits = async (req, res) => {
	try {
		const userId = req.user?.userId; 
		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Utilisateur non authentifié.',
			});
		}
		const circuits = await CustomCircuit.findAll({
			where: { userId, isDeleted: false },
			order: [['createdAt', 'DESC']],
		});

		// Fetch POI details for each circuit
		const { Op } = require('sequelize');
		const circuitsWithPOIs = await Promise.all(
			circuits.map(async (circuit) => {
				// Parse selectedPOIs if it's a string (from database)
				const poiIds = Array.isArray(circuit.selectedPOIs) 
					? circuit.selectedPOIs 
					: JSON.parse(circuit.selectedPOIs || '[]');

				// Récupérer les détails des POIs inclus dans ce circuit
				const poiDetails = await POI.findAll({
							where: {
								id: {
									[Op.in]: poiIds
								},
								isDeleted: false,
							},
							include: [
								{ model: POILocalization, as: 'frLocalization' },
								{ model: POILocalization, as: 'arLocalization' },
						{ model: POILocalization, as: 'enLocalization' },
						{ model: POIFile, as: 'files', where: { type: 'image' }, required: false },
					],
				});

				// Ordonner les POIs selon l'ordre dans selectedPOIs
				const orderedPoiDetails = poiIds
					.map((poiId) => poiDetails.find((p) => p.id === poiId))
					.filter(Boolean);

				return {
					...circuit.toJSON(),
					pois: orderedPoiDetails,
				};
			})
		);

		res.status(200).json({
			success: true,
			data: circuitsWithPOIs,
		});
	} catch (error) {
		console.error(
			'Erreur lors de la récupération des circuits personnalisés:',
			error
		);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Récupérer un circuit personnalisé par ID (avec détails des POIs)
 * @params { id } (ID du circuit personnalisé)
 * @user { userId }
 */
exports.getCustomCircuitById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.userId;
		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Utilisateur non authentifié.',
			});
		}

		const circuit = await CustomCircuit.findOne({
			where: { id, isDeleted: false },
		});

		if (!circuit) {
			return res
				.status(404)
				.json({ success: false, message: 'Circuit non trouvé.' });
		}

		// Vérifier si l'utilisateur est propriétaire OU si le circuit est public
		if (!circuit.isPublic && circuit.userId !== userId) {
			return res
				.status(403)
				.json({ success: false, message: 'Accès non autorisé.' });
		}

		// Parse selectedPOIs if it's a string (from database)
		const poiIds = Array.isArray(circuit.selectedPOIs) 
			? circuit.selectedPOIs 
			: JSON.parse(circuit.selectedPOIs || '[]');

		// Récupérer les détails des POIs inclus dans ce circuit
		// Use Sequelize.Op.in for array matching
		const { Op } = require('sequelize');
		const poiDetails = await POI.findAll({
			where: {
				id: {
					[Op.in]: poiIds
				},
				isDeleted: false,
			},
			include: [
				{ model: POILocalization, as: 'frLocalization' },
				{ model: POILocalization, as: 'arLocalization' },
				{ model: POILocalization, as: 'enLocalization' },
			],
		});

		// Ordonner les POIs selon l'ordre dans selectedPOIs
		const orderedPoiDetails = poiIds
			.map((poiId) => poiDetails.find((p) => p.id === poiId))
			.filter(Boolean); // Filter(Boolean) enlève les POIs non trouvés

		res.status(200).json({
			success: true,
			data: {
				...circuit.toJSON(),
				pois: orderedPoiDetails, // Remplacer selectedPOIs par les détails ordonnés
			},
		});
	} catch (error) {
		console.error(
			"Erreur lors de la récupération d'un circuit personnalisé:",
			error
		);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Mettre à jour un circuit personnalisé
 * @params { id }
 * @body { name?, description?, pois?, isPublic? }
 * @user { userId }
 */
exports.updateCustomCircuit = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.userId || 1; // Fallback to user ID 1 for testing

		// --- DÉBUT DE LA CORRECTION ---
		// 1. Accepter 'pois' et 'description'
		const { name, description, pois, isPublic } = req.body;
		// --- FIN DE LA CORRECTION ---

		const circuit = await CustomCircuit.findOne({
			where: { id, userId, isDeleted: false }, // L'utilisateur doit être le propriétaire
		});

		if (!circuit) {
			return res.status(404).json({
				success: false,
				message:
					"Circuit non trouvé ou vous n'êtes pas autorisé à le modifier.",
			});
		}

		// Construire l'objet de mise à jour
		const updateData = {};
		if (name !== undefined) updateData.name = xss(name);
		if (description !== undefined) updateData.description = xss(description);
		if (isPublic !== undefined) updateData.isPublic = isPublic;

		// --- DÉBUT DE LA CORRECTION ---
		// 2. Transformer 'pois' si 'pois' est fourni
		if (pois !== undefined && Array.isArray(pois)) {
			// S'assurer qu'il y a au moins 2 POIs
			if (pois.length < 2) {
				return res.status(400).json({
					success: false,
					message: 'Un circuit doit contenir au moins 2 POIs.',
				});
			}
			updateData.selectedPOIs = pois
				.sort((a, b) => a.order - b.order) // Assurer l'ordre
				.map((p) => p.poiId); // Extraire les IDs
		}
		// --- FIN DE LA CORRECTION ---

		const updatedCircuit = await circuit.update(updateData);

		res.status(200).json({
			success: true,
			message: 'Circuit mis à jour avec succès.',
			data: updatedCircuit,
		});
	} catch (error) {
		console.error('Erreur lors de la mise à jour du circuit:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Supprimer un circuit personnalisé (logique)
 * @params { id }
 * @user { userId }
 */
exports.deleteCustomCircuit = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.userId || 1; // Fallback to user ID 1 for testing

		const circuit = await CustomCircuit.findOne({
			where: { id, userId, isDeleted: false }, // L'utilisateur doit être propriétaire
		});

		if (!circuit) {
			return res.status(404).json({
				success: false,
				message:
					"Circuit non trouvé ou vous n'êtes pas autorisé à le supprimer.",
			});
		}

		// Suppression logique
		await circuit.update({ isDeleted: true });

		res.status(200).json({
			success: true,
			message: 'Circuit supprimé avec succès.',
		});
	} catch (error) {
		console.error('Erreur lors de la suppression du circuit:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};