// server-go-fez/controllers/StatisticsController.js

const {
	User,
	POI,
	Circuit,
	CustomCircuit,
	Review,
	POILocalization,
	Theme,
	Category,
	sequelize,
} = require('../models');

const { Op } = require('sequelize');


/**
 * Récupère des statistiques d'aperçu pour le tableau de bord admin.
 */
const getOverviewStats = async (req, res) => {
	try {
		const totalUsers = await User.count();
		const verifiedUsers = await User.count({ where: { isVerified: true } });
		const totalPois = await POI.count({ where: { isDeleted: false } });
		const verifiedPois = await POI.count({
			where: { isVerified: true, isDeleted: false },
		});
		const activeCircuits = await Circuit.count({
			where: { isActive: true, isDeleted: false },
		});
		const customCircuits = await CustomCircuit.count({
			where: { isDeleted: false },
		});
		const totalReviews = await Review.count({ where: { isDeleted: false } });
		
		// Get total themes
		const totalThemes = await Theme.count({ where: { isDeleted: false } });
		
		// Get total gamification points distributed (using PointsTransaction)
		const totalPointsResult = await sequelize.models.PointsTransaction?.sum('points') || 0;
		const totalPoints = totalPointsResult || 0;
		
		// Get new users this month
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);
		
		const newUsersThisMonth = await User.count({
			where: {
				createdAt: {
					[Op.gte]: startOfMonth
				}
			}
		});
		
		// Get new POIs this week
		const startOfWeek = new Date();
		startOfWeek.setDate(startOfWeek.getDate() - 7);
		startOfWeek.setHours(0, 0, 0, 0);
		
		const newPoisThisWeek = await POI.count({
			where: {
				createdAt: {
					[Op.gte]: startOfWeek
				},
				isDeleted: false
			}
		});

		res.status(200).json({
			success: true,
			data: {
				totalUsers,
				verifiedUsers,
				totalPois,
				verifiedPois,
				activeCircuits,
				customCircuits,
				totalReviews,
				totalThemes,
				totalPoints,
				newUsersThisMonth,
				newPoisThisWeek
			},
		});
	} catch (error) {
		console.error('Erreur lors de la récupération des statistiques:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

// --- NOUVELLES FONCTIONS DÉTAILLÉES ---

/**
 * Récupère la croissance des utilisateurs (nouvelles inscriptions par jour).
 * @query { days? (nombre de jours passés, défaut 7) }
 */
const getUserGrowth = async (req, res) => { 
	try {
		const days = parseInt(req.query.days || '7', 10);
		const today = new Date();
		today.setHours(23, 59, 59, 999); // Fin de la journée d'aujourd'hui

		const dateArray = [];
		const countsArray = [];

		for (let i = 0; i < days; i++) {
			const targetDate = new Date(today);
			targetDate.setDate(today.getDate() - i);
			const startOfDay = new Date(targetDate);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(targetDate);
			endOfDay.setHours(23, 59, 59, 999);

			const count = await User.count({

			});

			// Ajouter au début pour avoir l'ordre chronologique
			dateArray.unshift(startOfDay.toISOString().split('T')[0]); // Format YYYY-MM-DD
			countsArray.unshift(count);
		}

		res.status(200).json({
			success: true,
			data: {
				labels: dateArray, // Dates
				data: countsArray, // Nombre d'inscriptions
			},
		});
	} catch (error) {
		console.error('Erreur lors du calcul de la croissance utilisateur:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Récupère les POIs les plus populaires (basé sur le nombre d'avis).
 * @query { limit? (nombre de POIs à retourner, défaut 5) }
 */
const getPopularPois = async (req, res) => {
	try {
		const limit = parseInt(req.query.limit || '5', 10);

		const popularPois = await POI.findAll({
			where: { isDeleted: false },
			// Inclure les localisations pour le nom
			include: [
				{
					model: POILocalization,
					as: 'frLocalization',
					attributes: ['name'],
				},
				{
					model: POILocalization,
					as: 'enLocalization', // Optionnel, si besoin
					attributes: ['name'],
				},
                // Vous pouvez aussi inclure la catégorie, la ville etc.
			],
			// Compter le nombre d'avis associés
			attributes: {
				include: [
					[
						sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM "Reviews" AS r
                            WHERE
                                r."poiId" = "POI"."id"
                                AND r."isDeleted" = false
                        )`),
						'reviewCountLiteral', // Utiliser un alias différent de celui du modèle
					],
				],
                // Exclure les champs non nécessaires pour alléger la réponse
                exclude: ['ar', 'en', 'fr', 'coordinates', 'category', 'cityId', 'poiFileId', 'practicalInfo', 'isDeleted', 'createdAt', 'updatedAt']
			},
			// Trier par le nombre d'avis (calculé)
			order: [[sequelize.literal('"reviewCountLiteral"'), 'DESC']],
			limit: limit,
		});

        // Mapper pour simplifier la structure de la réponse
        const formattedPois = popularPois.map(poi => ({
            id: poi.id,
            name: poi.frLocalization?.name || poi.enLocalization?.name || 'N/A',
            rating: poi.rating,
            reviewCount: poi.reviewCount, // Note: reviewCountLiteral devrait être égal à poi.reviewCount si la mise à jour est correcte
            isVerified: poi.isVerified,
            isPremium: poi.isPremium,
            isActive: poi.isActive
        }));

		res.status(200).json({
			success: true,
			data: formattedPois,
		});
	} catch (error) {
		console.error('Erreur lors de la récupération des POIs populaires:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};


/**
 * Get theme popularity statistics
 */
const getThemePopularity = async (req, res) => {
	try {
		const limit = parseInt(req.query.limit || '3', 10);
		
		// Get all themes with their circuits
		const themes = await Theme.findAll({
			where: { isDeleted: false },
			include: [
				{
					model: Circuit,
					as: 'circuitsFromThemes',
					where: { isDeleted: false },
					required: false,
					through: { attributes: [] }
				}
			]
		});
		
		// Calculate stats for each theme
		const themeStats = themes.map(theme => {
			const circuitCount = theme.circuitsFromThemes?.length || 0;
			
			// Parse JSON if it's a string, otherwise use as-is
			const parseFr = typeof theme.fr === 'string' ? JSON.parse(theme.fr) : theme.fr;
			const parseEn = typeof theme.en === 'string' ? JSON.parse(theme.en) : theme.en;
			const parseAr = typeof theme.ar === 'string' ? JSON.parse(theme.ar) : theme.ar;
			
			// Extract name from JSON localization field
			const themeName = parseFr?.name || parseEn?.name || parseAr?.name || 'Thème Sans Nom';
			// Use theme color from database, or generate one
			const themeColor = theme.color || '#' + Math.floor(Math.random()*16777215).toString(16);
			
			return {
				name: themeName,
				color: themeColor,
				circuitCount: circuitCount,
				themeId: theme.id
			};
		});
		
		// Sort by circuit count (most popular first)
		themeStats.sort((a, b) => b.circuitCount - a.circuitCount);
		
		// Take top themes
		const topThemes = themeStats.slice(0, limit);
		
		// Find max count for percentage calculation
		const maxCount = topThemes.length > 0 ? topThemes[0].circuitCount : 1;
		
		// Format the response with percentages
		const formattedData = topThemes.map(theme => ({
			name: theme.name,
			color: theme.color,
			circuitCount: theme.circuitCount,
			// Calculate percentage relative to the most popular theme
			percentage: maxCount > 0 ? Math.round((theme.circuitCount / maxCount) * 100) : 0
		}));
		
		res.status(200).json({
			success: true,
			data: formattedData
		});
	} catch (error) {
		console.error('Error fetching theme popularity:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error.',
			error: error.message
		});
	}
};

/**
 * Get POI category distribution
 */
const getPOICategoryDistribution = async (req, res) => {
	try {
		// Get all POIs with their categories
		const pois = await POI.findAll({
			where: { isDeleted: false },
			include: [
				{
					model: Category,
					as: 'categoryPOI',
					attributes: ['id', 'fr', 'en', 'ar'],
					required: false
				}
			],
			attributes: ['id', 'category']
		});
		
		// Group by category and count
		const categoryCount = {};
		let total = 0;
		
		// Color palette for dynamic assignment
		const colorPalette = [
			'#003285', '#FF7F3E', '#0FC89C', '#FFD700', 
			'#9333EA', '#EF4444', '#10B981', '#22C55E',
			'#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899'
		];
		let colorIndex = 0;
		
		pois.forEach(poi => {
			if (poi.categoryPOI) {
				const categoryId = poi.category;
				
				// Parse JSON if it's a string, otherwise use as-is
				const parseFr = typeof poi.categoryPOI.fr === 'string' ? JSON.parse(poi.categoryPOI.fr) : poi.categoryPOI.fr;
				const parseEn = typeof poi.categoryPOI.en === 'string' ? JSON.parse(poi.categoryPOI.en) : poi.categoryPOI.en;
				const parseAr = typeof poi.categoryPOI.ar === 'string' ? JSON.parse(poi.categoryPOI.ar) : poi.categoryPOI.ar;
				
				// Extract name from JSON localization field
				const categoryName = parseFr?.name || 
				                    parseEn?.name || 
				                    parseAr?.name || 
				                    'Catégorie Inconnue';
				
				if (!categoryCount[categoryId]) {
					categoryCount[categoryId] = {
						name: categoryName,
						count: 0,
						id: categoryId,
						// Assign color from palette dynamically
						color: colorPalette[colorIndex % colorPalette.length]
					};
					colorIndex++;
				}
				categoryCount[categoryId].count++;
				total++;
			}
		});
		
		// Format the response
		const formattedData = Object.values(categoryCount)
			.map(item => ({
				name: item.name,
				color: item.color,
				count: item.count,
				percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
			}))
			// Sort by count (highest first)
			.sort((a, b) => b.count - a.count);
		
		res.status(200).json({
			success: true,
			data: formattedData
		});
	} catch (error) {
		console.error('Error fetching POI category distribution:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error.'
		});
	}
};


module.exports = {
	getOverviewStats,
    getUserGrowth,
    getPopularPois,
	getThemePopularity,
	getPOICategoryDistribution,
};