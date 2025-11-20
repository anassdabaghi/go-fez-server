// server-go-fez/controllers/PartnerController.js

const { Partner, PartnerVisit, sequelize } = require('../models');
const { uploadFromBuffer, deleteFile } = require('../Config/cloudinary');
const { awardPoints } = require('../services/GamificationService');
const xss = require('xss');
const { v4: uuidv4 } = require('uuid'); // Pour générer des QR codes uniques

/**
 * Créer un nouveau partenaire (Admin)
 * @body { name, nameAr?, nameEn?, category, description?, descriptionAr?, descriptionEn?, address?, coordinates?, discount?, isActive? }
 * @file logo (optionnel)
 */
exports.createPartner = async (req, res) => {
	try {
		// Supposer que les données JSON sont dans req.body.data si multipart/form-data
		const partnerData = req.body.data ? JSON.parse(req.body.data) : req.body;
		const {
			name,
			nameAr,
			nameEn,
			category,
			description,
			descriptionAr,
			descriptionEn,
			address,
			coordinates, // Doit être { type: 'Point', coordinates: [lng, lat] }
			discount,
			isActive,
		} = partnerData;

		if (!name || !category) {
			return res
				.status(400)
				.json({ success: false, message: 'name et category sont requis.' });
		}

		let logoUrl = null;
		let logoPublicId = null;

		// Gérer l'upload du logo
		if (req.file) {
			try {
				const result = await uploadFromBuffer(
					req.file.buffer,
					'go-fez/partners/logos'
				);
				logoUrl = result.secure_url;
				logoPublicId = result.public_id;
			} catch (uploadError) {
				console.warn('Échec upload logo partenaire:', uploadError.message);
			}
		}

		// Générer un QR code unique (simple UUID pour l'instant)
		const qrCodeValue = uuidv4();

		const newPartner = await Partner.create({
			name: xss(name),
			nameAr: nameAr ? xss(nameAr) : null,
			nameEn: nameEn ? xss(nameEn) : null,
			category: xss(category),
			description: description ? xss(description) : null,
			descriptionAr: descriptionAr ? xss(descriptionAr) : null,
			descriptionEn: descriptionEn ? xss(descriptionEn) : null,
			address: address ? xss(address) : null,
			coordinates: coordinates || null,
			logo: logoUrl,
			// logoPublicId: logoPublicId, // Ajouter si besoin de le stocker
			discount: discount ? xss(discount) : null,
			qrCode: qrCodeValue,
			isActive: isActive !== undefined ? isActive : true,
		});

		res.status(201).json({
			success: true,
			message: 'Partenaire créé avec succès.',
			data: newPartner,
		});
	} catch (error) {
		console.error('Erreur lors de la création du partenaire:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Récupérer tous les partenaires (Public ou Admin)
 * @query { isActive? (boolean) }
 */
exports.getAllPartners = async (req, res) => {
	try {
		const { isActive } = req.query;
		const where = { isDeleted: false };
		if (isActive !== undefined) {
			where.isActive = isActive === 'true';
		}

		const partners = await Partner.findAll({
			where: where,
			order: [['createdAt', 'DESC']],
			attributes: { exclude: ['isDeleted'] }, // Exclure isDeleted
		});

		res.status(200).json({
			success: true,
			data: partners,
		});
	} catch (error) {
		console.error('Erreur lors de la récupération des partenaires:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Récupérer un partenaire par ID (Public ou Admin)
 * @params { id }
 */
exports.getPartnerById = async (req, res) => {
	try {
		const { id } = req.params;
		const partner = await Partner.findOne({
			where: { id, isDeleted: false },
			attributes: { exclude: ['isDeleted'] },
		});

		if (!partner) {
			return res
				.status(404)
				.json({ success: false, message: 'Partenaire non trouvé.' });
		}

		res.status(200).json({
			success: true,
			data: partner,
		});
	} catch (error) {
		console.error("Erreur lors de la récupération d'un partenaire:", error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Mettre à jour un partenaire (Admin)
 * @params { id }
 * @body { // Champs similaires à la création }
 * @file logo (optionnel)
 */
exports.updatePartner = async (req, res) => {
	try {
		const { id } = req.params;
		const partnerData = req.body.data ? JSON.parse(req.body.data) : req.body;

		const partner = await Partner.findOne({
			where: { id, isDeleted: false },
		});

		if (!partner) {
			return res
				.status(404)
				.json({ success: false, message: 'Partenaire non trouvé.' });
		}

		// Gérer la mise à jour du logo
		if (req.file) {
			// Supprimer l'ancien logo si nécessaire (besoin de stocker public_id)
			// if (partner.logoPublicId) {
			//   await deleteFile(partner.logoPublicId).catch(err => console.warn("Échec suppression ancien logo"));
			// }
			try {
				const result = await uploadFromBuffer(
					req.file.buffer,
					'go-fez/partners/logos'
				);
				partnerData.logo = result.secure_url;
				// partnerData.logoPublicId = result.public_id;
			} catch (uploadError) {
				console.warn('Échec upload nouveau logo:', uploadError.message);
			}
		}

		// Nettoyer les données avant la mise à jour
		const fieldsToUpdate = [
			'name',
			'nameAr',
			'nameEn',
			'category',
			'description',
			'descriptionAr',
			'descriptionEn',
			'address',
			'coordinates',
			'logo',
			'discount',
			'qrCode', // Permettre la mise à jour si besoin, mais attention
			'isActive',
		];
		const updateData = {};
		fieldsToUpdate.forEach((field) => {
			if (partnerData[field] !== undefined) {
				// Sanitize si c'est une chaîne
				updateData[field] =
					typeof partnerData[field] === 'string'
						? xss(partnerData[field])
						: partnerData[field];
			}
		});

		const updatedPartner = await partner.update(updateData);

		res.status(200).json({
			success: true,
			message: 'Partenaire mis à jour avec succès.',
			data: updatedPartner,
		});
	} catch (error) {
		console.error('Erreur lors de la mise à jour du partenaire:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

/**
 * Supprimer un partenaire (logique) (Admin)
 * @params { id }
 */
exports.deletePartner = async (req, res) => {
	try {
		const { id } = req.params;
		const partner = await Partner.findOne({
			where: { id, isDeleted: false },
		});

		if (!partner) {
			return res
				.status(404)
				.json({ success: false, message: 'Partenaire non trouvé.' });
		}

		await partner.update({ isDeleted: true, isActive: false });

		res.status(200).json({
			success: true,
			message: 'Partenaire supprimé avec succès.',
		});
	} catch (error) {
		console.error('Erreur lors de la suppression du partenaire:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};

// --- Fonctionnalité Utilisateur ---

/**
 * Enregistrer une visite chez un partenaire (via scan QR)
 * @body { qrCode }
 * @user { userId }
 */
exports.registerVisit = async (req, res) => {
	const t = await sequelize.transaction();
	try {
		const { qrCode } = req.body;
		const userId = req.user.userId;

		if (!qrCode) {
			return res
				.status(400)
				.json({ success: false, message: 'qrCode est requis.' });
		}

		// 1. Trouver le partenaire correspondant au QR code
		const partner = await Partner.findOne({
			where: { qrCode: qrCode, isActive: true, isDeleted: false },
			transaction: t,
		});

		if (!partner) {
			return res.status(404).json({
				success: false,
				message: 'QR Code invalide ou partenaire inactif.',
			});
		}

		// 2. Vérifier si une visite récente a déjà été enregistrée (anti-spam)
		// Exemple: 1 visite max par heure pour le même partenaire
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		const recentVisit = await PartnerVisit.findOne({
			where: {
				userId,
				partnerId: partner.id,
				visitedAt: { [sequelize.Op.gte]: oneHourAgo },
			},
			transaction: t,
		});

		if (recentVisit) {
			await t.rollback(); // Pas besoin de continuer si déjà visité récemment
			return res.status(409).json({
				success: false,
				message: 'Visite déjà enregistrée récemment pour ce partenaire.',
			});
		}

		// 3. Enregistrer la visite
		const newVisit = await PartnerVisit.create(
			{
				userId,
				partnerId: partner.id,
				rewardClaimed: false, // Sera mis à jour si des points sont donnés
			},
			{ transaction: t }
		);

		// 4. Attribuer des points (optionnel, dépend de vos règles de gamification)
		// Exemple: Attribuer des points pour la première visite chez CE partenaire
		const firstVisitEver = await PartnerVisit.count({
            where: { userId, partnerId: partner.id },
            transaction: t
        }) <= 1;

		let pointsAwarded = false;
		if (firstVisitEver) { // Ou une autre logique: points à chaque visite ?
			try {
				// Utiliser une activité spécifique comme 'VISIT_PARTNER'
				// await awardPoints(userId, 'VISIT_PARTNER', t);
				console.log(`[Visit] Points pour 'VISIT_PARTNER' seraient attribués à ${userId}`);
				pointsAwarded = true;
				// Mettre à jour rewardClaimed si des points ont été (ou seraient) donnés
				await newVisit.update({ rewardClaimed: true }, { transaction: t });
			} catch (gamificationError) {
				console.error("[Visit] Erreur Gamification:", gamificationError);
				// Ne pas annuler la visite si la gamification échoue
			}
		}

		await t.commit();

		res.status(201).json({
			success: true,
			message: `Visite enregistrée chez ${partner.name}.`,
			data: {
				visitId: newVisit.id,
				partnerName: partner.name,
				pointsAwarded: pointsAwarded, // Informer le frontend
			},
		});
	} catch (error) {
		await t.rollback();
		console.error('Erreur lors de l-enregistrement de la visite:', error);
		res.status(500).json({
			success: false,
			message: 'Erreur interne du serveur.',
		});
	}
};