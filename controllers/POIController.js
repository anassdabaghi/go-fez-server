const { validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const logger = require('../Config/logger');
const { POI, POILocalization, POIFile, City, Category, User, UserSpace, TransportMode } = require('../models');
const EARTH_RADIUS_KM = 6371;
const { uploadFromBuffer, deleteFile, uploadPoiFile, uploadMultiplePoiFiles } = require('../Config/cloudinary');
const xss = require('xss');

// Middleware pour vérifier les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Erreurs de validation",
      errors: errors.array(),
    });
  }
  next();
};

// Méthode pour créer un POI avec upload de fichiers
const createPOIWithFiles = async (req, res) => {
  try {

    const {
      coordinates,
      category,
      practicalInfo,
      cityId,
      isActive = true,
      isVerified = false,
      isPremium = false,
      arLocalization,
      frLocalization,
      enLocalization
    } = req.body;

    // Parser les localisations JSON
    const arLoc = arLocalization ? JSON.parse(arLocalization) : null;
    const frLoc = frLocalization ? JSON.parse(frLocalization) : null;
    const enLoc = enLocalization ? JSON.parse(enLocalization) : null;

    // Validation: Au moins une localisation doit avoir un nom
    if (!arLoc?.name && !frLoc?.name && !enLoc?.name) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un nom de localisation est requis'
      });
    }

    // 1. Créer les localisations avec les fichiers audio uploadés
    let arLocalizationResponse = null;
    let frLocalizationResponse = null;
    let enLocalizationResponse = null;

    // Créer la localisation arabe
if (arLoc && arLoc.name) {
  let arabicAudioData = null; // <- Changement
  if (req.files?.ar_audio) {
    try {
      // console.log('📥 [AR AUDIO] File received:', ...);
      const audioResult = await uploadFromBuffer(
        req.files.ar_audio[0].buffer,
        'go-fez/audio/arabic',
        { resource_type: 'video' }
      );
      // ✅ Sauvegarder l'objet complet
      arabicAudioData = { 
        url: audioResult.secure_url, 
        publicId: audioResult.public_id 
      };
      // console.log('✅ [AR AUDIO UPLOADED] Cloudinary result:', audioResult);
    } catch (error) {
      console.warn('⚠️ Erreur upload audio arabe:', error.message);
    }
  }
  arLocalizationResponse = await POILocalization.create({
    name: xss(arLoc.name),
    description: arLoc.description ? xss(arLoc.description) : null,
    address: arLoc.address ? xss(arLoc.address) : null,
    // ✅ Sauvegarder l'objet JSON
    audioFiles: arabicAudioData ? JSON.stringify([arabicAudioData]) : null
  });
}

// Créer la localisation française
if (frLoc && frLoc.name) {
  let frenchAudioData = null; // <- Changement
  if (req.files?.fr_audio) {
    try {
      const audioResult = await uploadFromBuffer(
        req.files.fr_audio[0].buffer,
        'go-fez/audio/french',
        { resource_type: 'video' }
      );
      // ✅ Sauvegarder l'objet complet
      frenchAudioData = { 
        url: audioResult.secure_url, 
        publicId: audioResult.public_id 
      };
    } catch (error) {
      console.warn('⚠️ Erreur upload audio français:', error.message);
    }
  }
  frLocalizationResponse = await POILocalization.create({
    name: xss(frLoc.name),
    description: frLoc.description ? xss(frLoc.description) : null,
    address: frLoc.address ? xss(frLoc.address) : null,
    // ✅ Sauvegarder l'objet JSON
    audioFiles: frenchAudioData ? JSON.stringify([frenchAudioData]) : null
  });
}

// Créer la localisation anglaise
if (enLoc && enLoc.name) {
  let englishAudioData = null; // <- Changement
  if (req.files?.en_audio) {
    try {
      const audioResult = await uploadFromBuffer(
        req.files.en_audio[0].buffer,
        'go-fez/audio/english',
        { resource_type: 'video' }
      );
       // ✅ Sauvegarder l'objet complet
      englishAudioData = { 
        url: audioResult.secure_url, 
        publicId: audioResult.public_id 
      };
    } catch (error) {
      console.warn('⚠️ Erreur upload audio anglais:', error.message);
    }
  }
  enLocalizationResponse = await POILocalization.create({
    name: xss(enLoc.name),
    description: enLoc.description ? xss(enLoc.description) : null,
    address: enLoc.address ? xss(enLoc.address) : null,
    // ✅ Sauvegarder l'objet JSON
    audioFiles: englishAudioData ? JSON.stringify([englishAudioData]) : null
  });
}

    // 2. Créer le POI principal d'abord pour obtenir son ID
    const parsedCoordinates = JSON.parse(coordinates);
    const poiData = {
      ar: arLocalizationResponse?.id || null,
      fr: frLocalizationResponse?.id || null,
      en: enLocalizationResponse?.id || null,
      coordinates: parsedCoordinates,
      category: category,
      practicalInfo: practicalInfo ? JSON.parse(practicalInfo) : null,
      cityId: cityId,
      isActive: isActive === 'true' || isActive === true,
      isVerified: isVerified === 'true' || isVerified === true,
      isPremium: isPremium === 'true' || isPremium === true
    };

    
    // Créer le POI d'abord pour obtenir son ID
    const poiResponse = await POI.create(poiData);

    // 3. Maintenant créer les POIFiles avec le poiId du POI créé
    // Upload et création POIFiles pour les images (plusieurs fichiers en une fois)
    if (req.files?.image && req.files.image.length > 0) {
      try {
        const uploadResults = await uploadMultiplePoiFiles(req.files.image, 'image');
        for (const result of uploadResults) {
          await POIFile.create({
            poiId: poiResponse.id,
            fileUrl: result.fileUrl,
            filePublicId: result.filePublicId,
            type: 'image'
          });
        }
      } catch (error) {
      }
    }

    // Upload et création POIFiles pour les vidéos (plusieurs fichiers en une fois)
    if (req.files?.video && req.files.video.length > 0) {
      try {
        const uploadResults = await uploadMultiplePoiFiles(req.files.video, 'video');
        for (const result of uploadResults) {
          await POIFile.create({
            poiId: poiResponse.id,
            fileUrl: result.fileUrl,
            filePublicId: result.filePublicId,
            type: 'video'
          });
        }
      } catch (error) {
      }
    }
   // Upload et création POIFiles pour les albums d'images (nouveau type)
      if (req.files?.imageAlbum && req.files.imageAlbum.length > 0) {
        try {
        // Supposons que 'uploadMultiplePoiFiles' gère l'upload et retourne les résultats
        const uploadResults = await uploadMultiplePoiFiles(req.files.imageAlbum, 'imageAlbum'); 
        for (const result of uploadResults) {
            await POIFile.create({
                poiId: poiResponse.id,
                fileUrl: result.fileUrl,
                filePublicId: result.filePublicId,
                type: 'imageAlbum' 
            });
        }
    } catch (error) {
        console.warn('⚠️ Erreur upload imageAlbum:', error.message);
    }
  }


    // Créer POIFile pour le lien de visite virtuelle (si fourni)
    const { virtualTourUrl } = req.body;
    if (virtualTourUrl && virtualTourUrl.trim()) {
      try {
        await POIFile.create({
          poiId: poiResponse.id,
          fileUrl: virtualTourUrl.trim(),
          filePublicId: null,
          type: 'virtualtour'
        });
      } catch (error) {
      }
    }

    // Récupérer le POI complet avec ses relations
    const poiWithRelations = await POI.findByPk(poiResponse.id, {
      include: [
        { model: POILocalization, as: 'frLocalization' },
        { model: POILocalization, as: 'arLocalization' },
        { model: POILocalization, as: 'enLocalization' },
        { model: Category, as: 'categoryPOI' },
        { model: POIFile, as: 'files' },
        { model: City, as: 'city' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'POI créé avec succès avec fichiers',
      data: poiWithRelations
    });
  } catch (error) {
    console.error("Erreur lors de la création du POI avec fichiers:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Méthode pour récupérer tous les POI
const findAllPOIs = async (req, res) => {
  try {
    const { 
      page, 
      limit, 
      search = '', 
      category = '', 
      cityId = '', 
      isPremium, 
      isActive,
      sortBy
    } = req.query;

    // Smart endpoint: if no pagination params, return simple array (backward compatibility)
    if (!page && !limit) {
      const pois = await POI.findAll({
        where: { isDeleted: false },
        include: [
          { model: POILocalization, as: 'frLocalization', required: false },
          { model: POILocalization, as: 'arLocalization', required: false },
          { model: POILocalization, as: 'enLocalization', required: false },
          { model: Category, as: 'categoryPOI', attributes: ['id', 'fr', 'ar', 'en'], required: false },
          { model: POIFile, as: 'files', required: false },
          { model: City, as: 'city', attributes: ['id', 'name', 'nameAr', 'nameEn'], required: false }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Parse JSON fields
      const processedPOIs = pois.map(poi => {
        const poiData = poi.toJSON();
        // Parse coordinates if it's a string
        if (typeof poiData.coordinates === 'string') {
          try {
            poiData.coordinates = JSON.parse(poiData.coordinates);
          } catch (e) {
            console.warn('Error parsing coordinates:', e.message);
          }
        }
        // Parse practicalInfo if it's a string
        if (typeof poiData.practicalInfo === 'string') {
          try {
            poiData.practicalInfo = JSON.parse(poiData.practicalInfo);
          } catch (e) {
            console.warn('Error parsing practicalInfo:', e.message);
          }
        }
        return poiData;
      });

      return res.status(200).json({
        success: true,
        message: "POI récupérés avec succès",
        pois: processedPOIs
      });
    }

    // Otherwise, return paginated response
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { isDeleted: false };
    
    // Add filters
    if (category) where.category = category;
    if (cityId) where.cityId = cityId;
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Include models for associations
    const include = [
      { model: POILocalization, as: 'frLocalization', required: false },
      { model: POILocalization, as: 'arLocalization', required: false },
      { model: POILocalization, as: 'enLocalization', required: false },
      { model: Category, as: 'categoryPOI', attributes: ['id', 'fr', 'ar', 'en'], required: false },
      { model: POIFile, as: 'files', required: false },
      { model: City, as: 'city', attributes: ['id', 'name', 'nameAr', 'nameEn'], required: false }
    ];

    // Build where clause with search
    const whereClause = { ...where };
    if (search) {
      whereClause[Op.or] = [
        { '$frLocalization.name$': { [Op.like]: `%${search}%` } },
        { '$arLocalization.name$': { [Op.like]: `%${search}%` } },
        { '$enLocalization.name$': { [Op.like]: `%${search}%` } }
      ];
    }

    // Sorting
    let orderClause = [['createdAt', 'DESC']];
    if (sortBy === 'newest') orderClause = [['createdAt', 'DESC']];
    else if (sortBy === 'oldest') orderClause = [['createdAt', 'ASC']];
    else if (sortBy === 'name') orderClause = [[{ model: POILocalization, as: 'frLocalization' }, 'name', 'ASC']];

    // Get total count for pagination
    const totalCount = await POI.count({
      where: whereClause,
      include,
      distinct: true,
      subQuery: false
    });

    // Get POIs with pagination
    const pois = await POI.findAll({
      where: whereClause,
      include,
      limit: limitNum,
      offset: offset,
      order: orderClause,
      distinct: true,
      subQuery: false
    });

    // Parse JSON fields
    const processedPOIs = pois.map(poi => {
      const poiData = poi.toJSON();
      // Parse coordinates if it's a string
      if (typeof poiData.coordinates === 'string') {
        try {
          poiData.coordinates = JSON.parse(poiData.coordinates);
        } catch (e) {
          console.warn('Error parsing coordinates:', e.message);
        }
      }
      // Parse practicalInfo if it's a string
      if (typeof poiData.practicalInfo === 'string') {
        try {
          poiData.practicalInfo = JSON.parse(poiData.practicalInfo);
        } catch (e) {
          console.warn('Error parsing practicalInfo:', e.message);
        }
      }
      return poiData;
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "POI récupérés avec succès",
      data: {
        pois: processedPOIs,
        totalCount,
        currentPage: pageNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des POI:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

// Méthode pour récupérer un POI par ID
const findOnePOI = async (req, res) => {
  try {
    const { id } = req.params;

    const poi = await POI.findOne({
      where: { id, isDeleted: false },
      include: [
        { model: POILocalization, as: 'frLocalization' },
        { model: POILocalization, as: 'arLocalization' },
        { model: POILocalization, as: 'enLocalization' },
        { model: Category, as: 'categoryPOI' },
        { model: POIFile, as: 'files' },
        { model: City, as: 'city' }
      ]
    });

    if (!poi) {
      return res.status(404).json({
        success: false,
        message: "POI non trouvé",
      });
    }

    // Parse JSON fields
    const poiData = poi.toJSON();
    if (typeof poiData.coordinates === 'string') {
      try {
        poiData.coordinates = JSON.parse(poiData.coordinates);
      } catch (e) {
        console.warn('Error parsing coordinates:', e.message);
      }
    }
    if (typeof poiData.practicalInfo === 'string') {
      try {
        poiData.practicalInfo = JSON.parse(poiData.practicalInfo);
      } catch (e) {
        console.warn('Error parsing practicalInfo:', e.message);
      }
    }

    res.status(200).json({
      success: true,
      poi: poiData,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du POI:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

// Méthode pour mettre à jour un POI
const updatePOI = async (req, res) => {
  console.log('📩 audioToRemove brut reçu:', req.body.audioToRemove);
  try {
    const { id } = req.params;

    const poi = await POI.findOne({
      where: { id, isDeleted: false },
      include: [
        { model: POILocalization, as: 'frLocalization' },
        { model: POILocalization, as: 'arLocalization' },
        { model: POILocalization, as: 'enLocalization' },
        { model: POIFile, as: 'files' }
      ]
    });

    if (!poi) {
      return res.status(404).json({ success: false, message: "POI non trouvé" });
    }

    // --- Safe JSON parsing helper ---
    const safeParse = (input, label) => {
      try {
        return typeof input === 'string' ? JSON.parse(input) : input;
      } catch (err) {
        console.warn(`⚠️ Erreur parsing ${label}:`, err.message);
        return null;
      }
    };

    let poiData = req.body;
    if (req.body.data) {
      const parsed = safeParse(req.body.data, 'data');
      if (!parsed) return res.status(400).json({ success: false, message: 'Format de données invalide (data)' });
      poiData = parsed;
    }

let audioToRemove = { fr: false, ar: false, en: false };
if (req.body.audioToRemove) {
  try {
    audioToRemove = JSON.parse(req.body.audioToRemove);
  } catch (err) {
    console.warn('⚠️ Erreur parsing audioToRemove:', err.message);
    audioToRemove = { fr: false, ar: false, en: false }; // fallback
  }
}

      const filesToRemove = safeParse(poiData.filesToRemove, 'filesToRemove') || [];
    const arLoc = safeParse(poiData.arLocalization, 'arLocalization');
    const frLoc = safeParse(poiData.frLocalization, 'frLocalization');
    const enLoc = safeParse(poiData.enLocalization, 'enLocalization');

    // --- Audio deletion logic ---
    const deleteAudioIfNeeded = async (lang, localization, folder) => {
      if (!audioToRemove[lang] || !localization) return;
      try {
        const audioData = JSON.parse(localization.audioFiles || '[]');
        const publicId = audioData[0]?.publicId;
        if (publicId) {
          await deleteFile(publicId);
          console.log(`🗑️ Audio ${lang.toUpperCase()} supprimé de Cloudinary:`, publicId);
        }
        await localization.update({ audioFiles: null });
        console.log(`🧹 Audio ${lang.toUpperCase()} supprimé de la DB`);
      } catch (err) {
        console.warn(`⚠️ Erreur suppression audio ${lang.toUpperCase()}:`, err.message);
      }
    };

    await deleteAudioIfNeeded('fr', poi.frLocalization, 'french');
    await deleteAudioIfNeeded('ar', poi.arLocalization, 'arabic');
    await deleteAudioIfNeeded('en', poi.enLocalization, 'english');

    // --- Update localizations ---
    const updateLocalization = async (lang, locData, localization, folder) => {
      if (!locData || !localization) return;

      await localization.update({
        name: locData.name ? xss(locData.name) : localization.name,
        description: locData.description ? xss(locData.description) : localization.description,
        address: locData.address ? xss(locData.address) : localization.address
      });

      if (req.files?.[`${lang}_audio`]) {
        try {
          const oldAudioData = JSON.parse(localization.audioFiles || '[]');
          const oldPublicId = oldAudioData[0]?.publicId;
          if (oldPublicId) {
            await deleteFile(oldPublicId);
            console.log(`🗑️ Ancien audio ${lang.toUpperCase()} supprimé:`, oldPublicId);
          }

          const audioResult = await uploadFromBuffer(
            req.files[`${lang}_audio`][0].buffer,
            `go-fez/audio/${folder}`,
            { resource_type: 'video' }
          );

          const newAudioData = {
            url: audioResult.secure_url,
            publicId: audioResult.public_id
          };

          await localization.update({ audioFiles: JSON.stringify([newAudioData]) });
        } catch (error) {
          console.warn(`⚠️ Erreur upload audio ${lang.toUpperCase()}:`, error.message);
        }
      }
    };

    await updateLocalization('fr', frLoc, poi.frLocalization, 'french');
    await updateLocalization('ar', arLoc, poi.arLocalization, 'arabic');
    await updateLocalization('en', enLoc, poi.enLocalization, 'english');

    // --- Upload new media files ---
    if (req.files?.image?.length > 0) {
      const uploadResults = await uploadMultiplePoiFiles(req.files.image, 'image');
      for (const result of uploadResults) {
        await POIFile.create({
          poiId: poi.id,
          fileUrl: result.fileUrl,
          filePublicId: result.filePublicId,
          type: 'image'
        });
      }
    }

    if (req.files?.video?.length > 0) {
      const uploadResults = await uploadMultiplePoiFiles(req.files.video, 'video');
      for (const result of uploadResults) {
        await POIFile.create({
          poiId: poi.id,
          fileUrl: result.fileUrl,
          filePublicId: result.filePublicId,
          type: 'video'
        });
      }
    }

    // Mettre à jour les fichiers POI pour le type imageAlbum (nouveau type)
    if (req.files?.imageAlbum && req.files.imageAlbum.length > 0) {
      try {
        const uploadResults = await uploadMultiplePoiFiles(req.files.imageAlbum, 'imageAlbum');
        for (const result of uploadResults) {
            await POIFile.create({
                poiId: poi.id,
                fileUrl: result.fileUrl,
                filePublicId: result.filePublicId,
                type: 'imageAlbum' 
            });
        }
    } catch (error) {
        console.warn('⚠️ Erreur upload imageAlbum dans update:', error.message);
    }
  }

    // --- Update virtual tour ---
    const { virtualTourUrl } = req.body;
    if (virtualTourUrl) {
      const existingVirtualTour = await POIFile.findOne({
        where: { poiId: poi.id, type: 'virtualtour' }
      });

      if (existingVirtualTour) {
        await existingVirtualTour.update({ fileUrl: virtualTourUrl });
      } else {
        await POIFile.create({
          poiId: poi.id,
          fileUrl: virtualTourUrl,
          filePublicId: null,
          type: 'virtualtour'
        });
      }
    }

    // --- Delete marked files ---
    for (const fileId of filesToRemove) {
      try {
        const fileToDestroy = await POIFile.findOne({ where: { id: fileId } });
        if (fileToDestroy) {
          if (fileToDestroy.filePublicId) {
            await deleteFile(fileToDestroy.filePublicId);
            console.log('🗑️ Fichier supprimé de Cloudinary:', fileToDestroy.filePublicId);
          }
          await fileToDestroy.destroy();
          console.log('🗑️ Enregistrement fichier supprimé de la DB:', fileId);
        } else {
          console.warn('⚠️ Fichier à supprimer non trouvé (ID):', fileId);
        }
      } catch (err) {
        console.warn(`⚠️ Erreur suppression fichier (ID: ${fileId}):`, err.message);
      }
    }

    // --- Update POI core fields ---
    const updateData = {};
    if (poiData.coordinates) {
      updateData.coordinates = typeof poiData.coordinates === 'string'
        ? safeParse(poiData.coordinates, 'coordinates')
        : poiData.coordinates;
    }
    if (poiData.category) updateData.category = poiData.category;
    if (poiData.practicalInfo) {
      updateData.practicalInfo = typeof poiData.practicalInfo === 'string'
        ? safeParse(poiData.practicalInfo, 'practicalInfo')
        : poiData.practicalInfo;
    }
    if (poiData.cityId) updateData.cityId = poiData.cityId;
    if (poiData.isActive !== undefined) updateData.isActive = poiData.isActive === 'true' || poiData.isActive === true;
    if (poiData.isVerified !== undefined) updateData.isVerified = poiData.isVerified === 'true' || poiData.isVerified === true;
    if (poiData.isPremium !== undefined) updateData.isPremium = poiData.isPremium === 'true' || poiData.isPremium === true;

    await poi.update(updateData);

    const updatedPOI = await POI.findByPk(id, {
      include: [
        { model: POILocalization, as: 'frLocalization' },
        { model: POILocalization, as: 'arLocalization' },
        { model: POILocalization, as: 'enLocalization' },
        { model: Category, as: 'categoryPOI' },
        { model: POIFile, as: 'files' },
        { model: City, as: 'city' }
      ]
    });

    res.status(200).json({
      success: true,
      message: "POI mis à jour avec succès",
      data: updatedPOI
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du POI:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Méthode pour supprimer un POI (suppression logique)
const deletePOI = async (req, res) => {
  try {
    const { id } = req.params;

    const poi = await POI.findOne({
      where: { id, isDeleted: false },
      include: [{ model: POIFile, as: 'files' }]
    });

    if (!poi) {
      return res.status(404).json({
        success: false,
        message: "POI non trouvé",
      });
    }

    // Supprimer les fichiers Cloudinary avant la suppression logique
    if (poi.files && poi.files.length > 0) {
      for (const file of poi.files) {
        if (file.filePublicId) {
          await deleteFile(file.filePublicId).catch(err =>
            console.warn('⚠️ Erreur suppression fichier:', err)
          );
        }
      }
    }

    // Suppression logique
    await poi.update({ isDeleted: true });

    res.status(200).json({
      success: true,
      message: "POI supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du POI:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

// Méthode pour récupérer les POIs pour le Parcours Libre

const getPOIsForParcoursLibre = async (req, res) => {
  const { latitude, longitude, mode } = req.query;

  // 1. Validation de base
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: "Les paramètres géographiques (latitude, longitude) sont requis."
    });
  }

  try {
    const targetLat = parseFloat(latitude);
    const targetLon = parseFloat(longitude);

    // 1. Définir une durée de référence (ex: 10 minutes en heures)
    const referenceTimeHours = 10 / 60;

    let modeKey = mode || 'walk'; // Par défaut : 'walk' si non spécifié
    let maxDistanceKm = 5.0; // Rayon par défaut de secours

    // 2. Chercher la vitesse moyenne du mode de transport
    const transportMode = await TransportMode.findOne({
      where: { modeKey: modeKey },
      attributes: ['averageSpeedKmH']
    });

    if (transportMode && transportMode.averageSpeedKmH) {
      const speed = transportMode.averageSpeedKmH;
      // Distance = Vitesse (km/h) * Temps (heures)
      maxDistanceKm = speed * referenceTimeHours;

      // On s'assure qu'on ne dépasse pas une limite raisonnable (ex: 15 km)
      if (maxDistanceKm > 15) {
        maxDistanceKm = 15.0;
      }
    }

    // 2. Construction de la formule Haversine pour calculer la distance
    const POI_LAT = 'JSON_EXTRACT(POI.coordinates, "$.latitude")';
    const POI_LON = 'JSON_EXTRACT(POI.coordinates, "$.longitude")';

    const distanceLiteral = `(
            ${EARTH_RADIUS_KM} * acos(
                cos( radians(:targetLat) ) * cos( radians(${POI_LAT}) ) * cos( radians(${POI_LON}) - radians(:targetLon) )
                + sin( radians(:targetLat) ) * sin( radians(${POI_LAT}) )
            )
        )`;

    // 3. Conditions WHERE (filtrage par distance uniquement)
    const whereCondition = {
      isDeleted: false,
      isActive: true
    };

    const distanceWhere = Sequelize.where(Sequelize.literal(distanceLiteral), {
      [Op.lte]: maxDistanceKm
    });

    whereCondition[Op.and] = [distanceWhere];

    // 4. Exécution de la requête
    let pois = await POI.findAll({
      attributes: [
        'id',
        'coordinates',
        'cityId',
        'category',
        [Sequelize.literal(distanceLiteral), 'distance_km']
      ],
      where: whereCondition,
      replacements: { targetLat, targetLon },
      include: [
        {
          model: POILocalization,
          as: 'frLocalization',
          attributes: ['name', 'description']
        },
        {
          model: Category,
          as: 'categoryPOI',
          attributes: ['id', 'fr', 'ar']
        },
        {
          model: UserSpace,
          as: 'spaceDetails',
          required: false,
          attributes: ['userId'],
          include: [
            {
              model: User,
              as: 'spaceOwner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
              required: true
            }
          ]
        }
      ],
      order: [[Sequelize.literal('distance_km'), 'ASC']],
      raw: false,
      nest: true
    });

    // 5. Traitement des données : affichage conditionnel du propriétaire
    pois = pois.map(poi => {
      const plainPoi = poi.get({ plain: true });

      let ownerDetails = null;
      const spaceOwner = plainPoi.spaceDetails ? plainPoi.spaceDetails.spaceOwner : null;

      const isManaged = !!spaceOwner;

      if (isManaged) {
        ownerDetails = spaceOwner;
      }

      delete plainPoi.spaceDetails;

      return {
        ...plainPoi,
        infoProprietaire: ownerDetails
      };
    });

    // 6. Réponse finale
    res.status(200).json({
      success: true,
      message: `Parcours Libre exécuté avec succès. Rayon utilisé : ${maxDistanceKm.toFixed(2)} km. (Mode: ${modeKey}).`,
      count: pois.length,
      pois: pois
    });

  } catch (error) {
    console.error('❌ Erreur lors du parcours libre :', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche des points d’intérêt.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getTravelTime = async (req, res) => {

  const { distanceKm, mode } = req.query;

  if (!distanceKm || !mode) {
    return res.status(400).json({
      success: false,
      message: "Les paramètres 'distanceKm' et 'mode' sont requis."
    });
  }

  try {
    const distance = parseFloat(distanceKm);
    const modeKey = mode.toLowerCase();

    if (isNaN(distance) || distance <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre 'distanceKm' doit être un nombre positif."
      });
    }

    const transportMode = await TransportMode.findOne({
      where: { modeKey: modeKey },
      attributes: ['averageSpeedKmH']
    });

    if (!transportMode || !transportMode.averageSpeedKmH) {
      return res.status(404).json({
        success: false,
        message: `Mode de transport inconnu ou non supporté : '${modeKey}'.`
      });
    }

    const speedKmH = transportMode.averageSpeedKmH;

    const travelTimeHours = distance / speedKmH;

    const travelTimeMinutes = travelTimeHours * 60;

    res.status(200).json({
      success: true,
      message: "Calcul du temps de trajet réussi.",
      mode: modeKey,
      speedKmH: speedKmH,
      distanceKm: parseFloat(distance.toFixed(2)),
      travelTimeMinutes: parseFloat(travelTimeMinutes.toFixed(2))
    });

  } catch (error) {
    console.error('❌ Erreur lors du calcul du temps de trajet :', error);
  }
};


module.exports = {
  handleValidationErrors,
  createPOIWithFiles,
  findAllPOIs,
  findOnePOI,
  updatePOI,
  deletePOI,
  getPOIsForParcoursLibre,
  getTravelTime
};