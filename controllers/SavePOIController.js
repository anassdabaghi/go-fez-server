const { FavoritePOI, POI, Category } = require('../models');

/**
 * Sauvegarder un POI pour l'utilisateur connecté
 * POST /api/save-poi/:poiId
 */
exports.savePOI = async (req, res) => {
  try {
    const { poiId } = req.params;
    const userId = req.user?.userId;

    // Vérifier que l'utilisateur est authentifié
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Utilisateur non authentifié'
      });
    }

    // Vérifier que le POI existe
    const poi = await POI.findByPk(poiId);
    if (!poi) {
      return res.status(404).json({
        status: 'fail',
        message: 'POI non trouvé'
      });
    }

    // Vérifier si le POI est déjà sauvegardé par cet utilisateur
    const existingSave = await FavoritePOI.findOne({
      where: {
        userId: userId,
        poiId: poiId
      }
    });

    if (existingSave) {
      return res.status(409).json({
        status: 'fail',
        message: 'Ce POI est déjà sauvegardé'
      });
    }

    // Sauvegarder le POI
    await FavoritePOI.create({
      userId: userId,
      poiId: poiId
    });

    res.status(201).json({
      status: 'success',
      message: 'POI sauvegardé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur savePOI:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Erreur serveur'
    });
  }
};

/**
 * Retirer un POI des sauvegardes de l'utilisateur connecté
 * DELETE /api/save-poi/:poiId
 */
exports.unsavePOI = async (req, res) => {
  try {
    const { poiId } = req.params;
    const userId = req.user?.userId;

    // Vérifier que l'utilisateur est authentifié
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Utilisateur non authentifié'
      });
    }

    // Chercher la sauvegarde
    const savedPOI = await FavoritePOI.findOne({
      where: {
        userId: userId,
        poiId: poiId
      }
    });

    if (!savedPOI) {
      return res.status(404).json({
        status: 'fail',
        message: 'POI non trouvé dans vos sauvegardes'
      });
    }

    // Supprimer la sauvegarde
    await savedPOI.destroy();

    res.status(200).json({
      status: 'success',
      message: 'POI retiré des sauvegardes avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur unsavePOI:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Erreur serveur'
    });
  }
};

/**
 * Récupérer tous les POIs sauvegardés par l'utilisateur connecté
 * GET /api/save-poi
 */
exports.getSavedPOIs = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Vérifier que l'utilisateur est authentifié
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Utilisateur non authentifié'
      });
    }

    // Récupérer les POIs sauvegardés avec les informations complètes
    const savedPOIs = await FavoritePOI.findAll({
      where: {
        userId: userId
      },
      include: [
        {
          model: POI,
          as: 'poi',
          include: [
            {
              model: Category,
              as: 'categoryPOI',
              attributes: ['id', 'ar', 'fr', 'en', 'icon']
            }
          ]
        }
      ],
      order: [['savedAt', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      count: savedPOIs.length,
      data: savedPOIs
    });
  } catch (error) {
    console.error('❌ Erreur getSavedPOIs:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Erreur serveur'
    });
  }
};

/**
 * Vérifier si un POI est sauvegardé par l'utilisateur connecté
 * GET /api/save-poi/check/:poiId
 */
exports.checkIfSaved = async (req, res) => {
  try {
    const { poiId } = req.params;
    const userId = req.user?.userId;

    // Vérifier que l'utilisateur est authentifié
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Utilisateur non authentifié'
      });
    }

    // Vérifier si le POI est sauvegardé
    const savedPOI = await FavoritePOI.findOne({
      where: {
        userId: userId,
        poiId: poiId
      }
    });

    res.status(200).json({
      status: 'success',
      isSaved: !!savedPOI
    });
  } catch (error) {
    console.error('❌ Erreur checkIfSaved:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Erreur serveur'
    });
  }
};

