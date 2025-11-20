// server-go-fez/controllers/FavoriteController.js

const {
	UserFavorite,
	POI,
	POILocalization,
	POIFile,
	City,
} = require('../models');

/**
 * Ajoute ou supprime un POI des favoris de l'utilisateur.
 * @body { poiId }
 * @user { userId }
 */
exports.toggleFavorite = async (req, res) => {
	try {
		const { poiId } = req.body;
		const userId = req.user.userId; // Supposé provenir de l'auth middleware

		if (!poiId) {
			return res
				.status(400)
				.json({ success: false, message: 'poiId est requis.' });
		}

		// Vérifier si le favori existe déjà
		const existingFavorite = await UserFavorite.findOne({
			where: { userId, poiId },
		});

		if (existingFavorite) {
			// S'il existe, le supprimer
			await existingFavorite.destroy();
			res.status(200).json({
				success: true,
				message: 'Favori supprimé avec succès.',
				action: 'removed',
			});
		} else {
			// S'il n'existe pas, le créer
			await UserFavorite.create({ userId, poiId });
			res.status(201).json({
				success: true,
				message: 'Favori ajouté avec succès.',
				action: 'added',
			});
		}
	} catch (error) {
		console.error('Erreur lors du basculement du favori:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Récupère tous les POIs favoris de l'utilisateur connecté.
 * @user { userId }
 */
exports.getFavoritePOIs = async (req, res) => {
	try {
		const userId = req.user.userId;

		const userWithFavorites = await UserFavorite.findAll({
			where: { userId },
			include: [
				{
					model: POI,
					as: 'poi', // Doit correspondre à l'alias dans ReviewController
					where: { isDeleted: false },
					// Inclure les détails du POI pour affichage
					include: [
						{ model: POILocalization, as: 'frLocalization' },
						{ model: POILocalization, as: 'arLocalization' },
						{ model: POILocalization, as: 'enLocalization' },
						{ model: POIFile, as: 'poiFile' },
						{ model: City, as: 'city' },
					],
				},
			],
			order: [['createdAt', 'DESC']],
		});

		// Extraire uniquement les POIs
		const favoritePOIs = userWithFavorites.map((fav) => fav.poi);

		res.status(200).json({
			success: true,
			data: favoritePOIs,
		});
	} catch (error) {
		console.error('Erreur lors de la récupération des favoris:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};