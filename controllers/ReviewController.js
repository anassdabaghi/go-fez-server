// server-go-fez/controllers/ReviewController.js

const { Review, POI, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { uploadFromBuffer, deleteFile } = require('../Config/cloudinary');
const { awardReview, awardPoints } = require('../services/GamificationService');
const ContentModerationService = require('../services/ContentModerationService'); 
const xss = require('xss');

/**
 * Calcule et met à jour la note moyenne et le nombre d'avis pour un POI.
 * @param {string} poiId - L'ID du POI à mettre à jour.
 * @param {object} transaction - La transaction Sequelize à utiliser.
 */
const updatePOIRating = async (poiId, transaction) => {
	try {
		const stats = await Review.findAll({
			where: {
				poiId: poiId,
				isDeleted: false, // Ne compte que les avis non supprimés
				isAccepted: true, // Only count accepted reviews
			},
			attributes: [
				[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
				[sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
			],
			transaction: transaction, // S'assure de lire dans la transaction
		});

		let { avgRating, reviewCount } = stats[0].get();
		avgRating = avgRating ? parseFloat(avgRating).toFixed(2) : 0;
		reviewCount = reviewCount || 0;

		await POI.update(
			{
				rating: avgRating,
				reviewCount: reviewCount,
			},
			{
				where: { id: poiId },
				transaction: transaction, // S'assure d'écrire dans la transaction
			}
		);
	} catch (error) {
		console.error('Erreur lors de la mise à jour du rating du POI:', error);
		// L'erreur sera attrapée par le bloc catch externe
		throw new Error('Impossible de mettre à jour la note du POI.');
	}
};

// --- CRUD ---

/**
 * Créer un nouvel avis pour un POI
 * Requiert: req.user.userId (de l'auth), req.body.poiId, req.body.rating, req.body.comment
 * Optionnel: req.files.photos (tableau de fichiers)
 */
exports.createReview = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const { poiId, rating, comment } = req.body;
		const userId = req.user.userId;

		if (!poiId || !rating) {
            await t.rollback();
			return res.status(400).json({ success: false, message: 'poiId et rating requis.' });
		}

		const existingReview = await Review.findOne({ where: { userId, poiId, isDeleted: false } });
		if (existingReview) {
            await t.rollback();
			return res.status(409).json({ success: false, message: 'Avis déjà existant pour ce POI.' });
		}

        // --- AI MODERATION ---
        let isAccepted = false;
        let aiReport = null;

        if (comment && comment.trim().length > 0) {
            const moderation = await ContentModerationService.moderateContent(comment);
            if (moderation.action === 'APPROVE') {
                isAccepted = true;
                aiReport = 'Auto-approved by AI';
            } else {
                // REJECT or UNCERTAIN -> Pending/Rejected
                isAccepted = false;
                aiReport = `${moderation.action}: ${moderation.reason}`;
            }
        } else {
            // No comment = Auto-approve
            isAccepted = true;
            aiReport = 'Auto-approved (Rating only)';
        }

		// Handle Photos
		let photoUrls = [];
		if (req.files && req.files.length > 0) {
			for (const file of req.files) {
				try {
					const result = await uploadFromBuffer(file.buffer, 'go-fez/reviews');
					photoUrls.push(result.secure_url);
				} catch (e) { console.warn('Upload failed:', e.message); }
			}
		}

		const newReview = await Review.create({
				userId, poiId, rating: parseFloat(rating),
				comment: comment ? xss(comment) : null,
				photos: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
                isAccepted, // Set status based on AI
                aiReport
			}, { transaction: t });

		if (isAccepted) {
			await updatePOIRating(poiId, t);
		}

		await t.commit();

        // --- GAMIFICATION: ONLY IF ACCEPTED ---
        if (isAccepted) {
            const isDetailed = comment && comment.length >= 100;
            awardReview(userId, newReview.id, isDetailed)
                .catch(err => console.error('Error awarding review points:', err));
            
            if (photoUrls.length > 0) {
                awardPoints(userId, 'PHOTOGRAPHY_LOVER')
                    .catch(err => console.error('Error awarding photography points:', err));
            }
        }

		res.status(201).json({
			success: true,
			message: isAccepted ? 'Avis publié.' : 'Avis en attente de modération.',
			data: newReview,
		});
	} catch (error) {
		await t.rollback();
		console.error('Erreur création avis:', error);
		res.status(500).json({ success: false, message: 'Erreur serveur.' });
	}
};

/**
 * Obtenir tous les avis pour un POI (avec pagination)
 * Requiert: req.params.poiId
 * Optionnel: req.query.page, req.query.limit
 */
exports.getReviewsForPOI = async (req, res) => {
	try {
		const { poiId } = req.params;
		const { page = 1, limit = 10 } = req.query;
		const offset = (page - 1) * limit;

		const { count, rows } = await Review.findAndCountAll({
			where: {
				poiId: poiId,
				isDeleted: false,
				isAccepted: true, // Only show accepted reviews to public
			},
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['firstName', 'lastName', 'profileImage'], // Ne pas inclure le mot de passe
				},
			],
			order: [['created_at', 'DESC']],
			limit: parseInt(limit, 10),
			offset: parseInt(offset, 10),
		});

		res.status(200).json({
			success: true,
			data: {
				totalItems: count,
				totalPages: Math.ceil(count / limit),
				currentPage: parseInt(page, 10),
				reviews: rows,
			},
		});
	} catch (error) {
		console.error('Erreur lors de la récupération des avis:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Get user's own reviews with their status (pending, accepted, denied)
 * Requires: req.user.userId
 * Optional: req.query.page, req.query.limit
 */
exports.getUserReviews = async (req, res) => {
	try {
		const userId = req.user.userId;
		const { page = 1, limit = 10 } = req.query;
		const offset = (page - 1) * limit;

		const { count, rows } = await Review.findAndCountAll({
			where: {
				userId: userId,
				isDeleted: false,
			},
			include: [
				{
					model: POI,
					as: 'poi',
					attributes: ['id', 'fr', 'en', 'ar'],
				},
			],
			order: [['created_at', 'DESC']],
			limit: parseInt(limit, 10),
			offset: parseInt(offset, 10),
		});

		res.status(200).json({
			success: true,
			data: {
				totalItems: count,
				totalPages: Math.ceil(count / limit),
				currentPage: parseInt(page, 10),
				reviews: rows,
			},
		});
	} catch (error) {
		console.error('Error fetching user reviews:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * ADMIN: Get all pending reviews
 * Requires: req.user.role === 'admin'
 * Optional: req.query.page, req.query.limit, req.query.status
 */
exports.getPendingReviews = async (req, res) => {
	try {
		const { page = 1, limit = 10, status = 'pending' } = req.query;
		const offset = (page - 1) * limit;

		let whereClause = {
			isDeleted: false,
		};

		if (status === 'pending') {
			whereClause.isAccepted = false;
            // ✅ FIX: Pending includes NO report OR 'UNCERTAIN' reports (System errors)
			whereClause[Op.or] = [
                { aiReport: null },
                { aiReport: { [Op.like]: 'UNCERTAIN:%' } } // Matches our new clean error message
            ];
		} else if (status === 'accepted') {
			whereClause.isAccepted = true;
		} else if (status === 'denied') {
			whereClause.isAccepted = false;
            // ✅ FIX: Denied is ONLY explicit rejections, NOT uncertainties
			whereClause.aiReport = { 
                [Op.ne]: null,
                [Op.notLike]: 'UNCERTAIN:%' 
            }; 
		}

		const { count, rows } = await Review.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: User,
					as: 'user',
					attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'],
				},
				{
					model: POI,
					as: 'poi',
					attributes: ['id', 'fr', 'en', 'ar'],
                    include: [
						{ model: require('../models').POILocalization, as: 'frLocalization', attributes: ['name'] },
						{ model: require('../models').POILocalization, as: 'enLocalization', attributes: ['name'] },
						{ model: require('../models').POILocalization, as: 'arLocalization', attributes: ['name'] }
					]
				},
			],
			order: [['created_at', 'DESC']],
			limit: parseInt(limit, 10),
			offset: parseInt(offset, 10),
		});

		res.status(200).json({
			success: true,
			data: {
				totalItems: count,
				totalPages: Math.ceil(count / limit),
				currentPage: parseInt(page, 10),
				reviews: rows,
			},
		});
	} catch (error) {
		console.error('Error fetching pending reviews:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * ADMIN: Approve a review
 * Requires: req.params.reviewId, req.user.role === 'admin'
 */
exports.approveReview = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const { reviewId } = req.params;
		const review = await Review.findByPk(reviewId);

		if (!review) {
			await t.rollback();
			return res.status(404).json({ success: false, message: 'Avis non trouvé.' });
		}

		if (review.isAccepted) {
			await t.rollback();
			return res.status(400).json({ success: false, message: 'Déjà approuvé.' });
		}

		await review.update({ isAccepted: true, aiReport: null }, { transaction: t });

		if (review.poiId) {
			await updatePOIRating(review.poiId, t);
		}

		await t.commit();

        // --- GAMIFICATION: AWARD POINTS NOW ---
        // We must check if points were already given? 
        // Since we only give points on creation IF isAccepted=true, 
        // and this review was isAccepted=false, users haven't received points yet.
        
        const isDetailed = review.comment && review.comment.length >= 100;
        awardReview(review.userId, review.id, isDetailed)
            .catch(err => console.error('Error awarding review points (admin approve):', err));

        // Check for photos to award photography points
        let hasPhotos = false;
        try {
            const photos = review.photos ? JSON.parse(review.photos) : [];
            hasPhotos = photos.length > 0;
        } catch (e) {}

        if (hasPhotos) {
            awardPoints(review.userId, 'PHOTOGRAPHY_LOVER')
                .catch(err => console.error('Error awarding photo points (admin approve):', err));
        }

		res.status(200).json({
			success: true,
			message: 'Avis approuvé et points attribués.',
			data: review,
		});
	} catch (error) {
		await t.rollback();
		console.error('Error approving review:', error);
		res.status(500).json({ success: false, message: 'Erreur serveur.' });
	}
};

/**
 * ADMIN: Deny a review
 * Requires: req.params.reviewId, req.body.reason, req.user.role === 'admin'
 */
exports.denyReview = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const { reviewId } = req.params;
		const { reason } = req.body;

		if (!reason) {
			return res.status(400).json({
				success: false,
				message: 'Une raison de refus est requise.',
			});
		}

		const review = await Review.findByPk(reviewId);

		if (!review) {
			await t.rollback();
			return res.status(404).json({
				success: false,
				message: 'Avis non trouvé.',
			});
		}

		// Deny the review
		await review.update(
			{
				isAccepted: false,
				aiReport: xss(reason),
			},
			{ transaction: t }
		);

		// Update POI rating to exclude this review
		if (review.poiId) {
			await updatePOIRating(review.poiId, t);
		}

		await t.commit();

		res.status(200).json({
			success: true,
			message: 'Avis refusé avec succès.',
			data: review,
		});
	} catch (error) {
		await t.rollback();
		console.error('Error denying review:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Supprimer un avis (logique)
 * Requiert: req.params.reviewId, req.user (userId, role)
 */
exports.deleteReview = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const { reviewId } = req.params;
		const { userId, role } = req.user; // De l'auth middleware

		const review = await Review.findByPk(reviewId);

		if (!review) {
			return res
				.status(404)
				.json({ success: false, message: 'Avis non trouvé.' });
		}

		// Vérifier les permissions : l'utilisateur est propriétaire ou admin
		if (review.userId !== userId && role !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Non autorisé à supprimer cet avis.',
			});
		}

		// Suppression logique
		await review.update({ isDeleted: true }, { transaction: t });

		// Mettre à jour la note moyenne du POI
		await updatePOIRating(review.poiId, t);

		// Valider la transaction
		await t.commit();

		res.status(200).json({
			success: true,
			message: 'Avis supprimé avec succès.',
		});
	} catch (error) {
		// Annuler la transaction
		await t.rollback();
		console.error('Erreur lors de la suppression de l-avis:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};