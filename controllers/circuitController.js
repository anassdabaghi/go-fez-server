const { Circuit, Theme, POI, ThemeCircuit, CircuitPOI, City, POILocalization, POIFile, Review, User } = require('../models');
const { Op, literal } = require('sequelize');
const sequelize = require('sequelize');
const xss = require('xss');
const { deleteFile } = require("../Config/cloudinary");

// Créer un circuit avec upload d'image
exports.createCircuitWithImage = async (req, res) => {
  try {
    console.log('📁 Fichier image reçu:', req.file ? req.file.originalname : 'Aucun');

    const { data } = req.body;
    const circuitData = JSON.parse(data);
    const {
      cityId,
      duration,
      distance,
      startPoint,
      endPoint,
      price,
      isActive,
      isPremium,
      themeIds,
      poiIds,
      localizations
    } = circuitData;

    // Validation des champs requis
    if (!cityId || !duration || !distance) {
      if (req.file) await deleteFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'Champs requis manquants (cityId, duration, distance)'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'L\'image du circuit est requise'
      });
    }

    // Validation des localisations
    if (!localizations || !localizations.ar || !localizations.fr || !localizations.en) {
      if (req.file) await deleteFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'Les localisations (ar, fr, en) sont requises'
      });
    }

    // Sanitization des données
    const sanitizedData = {
      ar: {
        name: xss(localizations.ar.name || ''),
        description: xss(localizations.ar.description || '')
      },
      fr: {
        name: xss(localizations.fr.name || ''),
        description: xss(localizations.fr.description || '')
      },
      en: {
        name: xss(localizations.en.name || ''),
        description: xss(localizations.en.description || '')
      },
      duration: duration ? Number(duration) : null,
      distance: distance ? Number(distance) : null,
      startPoint: startPoint || null,
      endPoint: endPoint || null,
      isPremium: isPremium === 'true' || isPremium === true,
      price: price ? Number(price) : null,
      rating: 0,
      reviewCount: 0,
      cityId,
      isActive: isActive === 'true' || isActive === true,
      isDeleted: false,
      image: req.file.path,
      imagePublicId: req.file.filename
    };

    console.log('🏗️ Création du circuit avec les données:', sanitizedData);

    // Création du circuit
    const circuit = await Circuit.create(sanitizedData);

    // Liaison des thèmes
    if (themeIds && Array.isArray(themeIds) && themeIds.length > 0) {
      const themes = await Theme.findAll({
        where: {
          id: themeIds,
          isDeleted: false
        }
      });
      
      if (themes.length !== themeIds.length) {
        console.warn('⚠️ Certains thèmes n\'ont pas été trouvés');
      }
      
      await circuit.setThemes(themes);
    }

    // Liaison des POIs avec ordre et temps estimé
    if (poiIds && Array.isArray(poiIds) && poiIds.length > 0) {
      // Vérifier que les POIs existent
      const pois = await POI.findAll({
        where: {
          id: poiIds,
          isDeleted: false
        }
      });

      if (pois.length !== poiIds.length) {
        console.warn('⚠️ Certains POIs n\'ont pas été trouvés');
      }

      // Créer les liaisons avec ordre
      for (let i = 0; i < poiIds.length; i++) {
        const poiExists = pois.find(p => p.id === poiIds[i]);
        if (poiExists) {
          await CircuitPOI.create({
            circuitId: circuit.id,
            poiId: poiIds[i],
            order: i + 1,
            estimatedTime: null
          });
        }
      }
    }

    // Récupération du circuit complet avec ses relations
    const circuitWithRelations = await Circuit.findByPk(circuit.id, {
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'name', 'nameAr', 'nameEn']
        },
        {
          model: Theme,
          as: 'themes',
          through: { attributes: [] },
          where: { isDeleted: false },
          required: false
        },
        {
          model: POI,
          as: 'pois',
          through: {
            attributes: ['order', 'estimatedTime']
          },
          where: { isDeleted: false },
          required: false,
          include: [
            {
              model: POILocalization,
              as: 'frLocalization',
              attributes: ['name']
            }
          ]
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Circuit créé avec succès',
      data: circuitWithRelations
    });
  } catch (error) {
    console.error('❌ Erreur création circuit avec image:', error);
    
    // Supprimer l'image uploadée en cas d'erreur
    if (req.file) {
      await deleteFile(req.file.filename).catch(err =>
        console.warn('⚠️ Erreur suppression image après échec:', err)
      );
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.rateCircuit = async (req, res) => {
  try {
    const userId = req.user.userId; // Récupérer l'ID de l'utilisateur authentifié
    const { circuitId, rating } = req.body;

  } catch (error) {
    console.error('❌ Erreur notation circuit :', error);
    return res.status(500).json({ status: 'error', message: 'Erreur serveur', error });
  }
};


// Récupérer tous les circuits (filtrés et triés)

exports.getAllCircuits = async (req, res) => {
    try {
        const {
            page,
            limit,
            search = '',
            themeId,
            cityId,
            isPremium,
            isActive,
            sortBy = 'newest',
            latitude,
            longitude
        } = req.query;

        // Build where clause
        const whereClause = { isDeleted: false };

        // Add filters
        if (cityId) whereClause.cityId = cityId;
        if (isPremium !== undefined) whereClause.isPremium = isPremium === 'true';
        if (isActive !== undefined) whereClause.isActive = isActive === 'true';

        // Build order clause
        let orderClause = [];
        switch (sortBy) {
            case 'popular':
                orderClause.push(['reviewCount', 'DESC']);
                break;
            case 'rating':
                orderClause.push(['rating', 'DESC']);
                break;
            case 'newest':
            default:
                orderClause.push(['createdAt', 'DESC']);
                break;
        }

        // Build includes
        const includes = [
            {
                model: City,
                as: 'city',
                attributes: ['id', 'name', 'nameAr', 'nameEn']
            },
            {
                model: Theme,
                as: 'themes',
                through: { attributes: [] },
                where: themeId ? { id: themeId, isDeleted: false } : { isDeleted: false },
                required: !!themeId,
                attributes: ['id', 'fr', 'ar', 'en']
            },
            {
                model: POI,
                as: 'pois',
                through: { attributes: ['order', 'estimatedTime'] },
                where: { isDeleted: false },
                required: false,
                attributes: ['id', 'category'],  // Added 'category' field
                include: [
                    { model: POILocalization, as: 'frLocalization', attributes: ['name'] },
                    { model: POILocalization, as: 'arLocalization', attributes: ['name'] },
                    { model: POILocalization, as: 'enLocalization', attributes: ['name'] }
                ]
            }
        ];

        // Add search filter
        let searchCondition = {};
        if (search) {
            // Search in JSON fields using Sequelize's JSON path syntax
            searchCondition = {
                [Op.or]: [
                    sequelize.where(
                        sequelize.cast(sequelize.col('Circuit.fr'), 'CHAR'),
                        { [Op.like]: `%${search}%` }
                    ),
                    sequelize.where(
                        sequelize.cast(sequelize.col('Circuit.ar'), 'CHAR'),
                        { [Op.like]: `%${search}%` }
                    ),
                    sequelize.where(
                        sequelize.cast(sequelize.col('Circuit.en'), 'CHAR'),
                        { [Op.like]: `%${search}%` }
                    )
                ]
            };
        }

        // Smart endpoint: if no pagination params, return simple array (backward compatibility)
        if (!page && !limit) {
            const circuits = await Circuit.findAll({
                where: { ...whereClause, ...searchCondition },
                include: includes,
                order: orderClause,
                subQuery: false,
                distinct: true
            });

            // Process circuits (parse JSON localizations)
            const processedCircuits = circuits.map(circuitInstance => {
                const circuit = circuitInstance.toJSON();

                // Parse circuit localizations
                try {
                    if (circuit.ar) circuit.ar = JSON.parse(circuit.ar);
                    if (circuit.fr) circuit.fr = JSON.parse(circuit.fr);
                    if (circuit.en) circuit.en = JSON.parse(circuit.en);
                } catch (e) {
                    console.warn('Erreur parsing circuit localization:', e.message);
                }

                // Parse theme localizations
                if (circuit.themes && Array.isArray(circuit.themes)) {
                    circuit.themes = circuit.themes.map(theme => {
                        try {
                            if (theme.ar) theme.ar = JSON.parse(theme.ar);
                            if (theme.fr) theme.fr = JSON.parse(theme.fr);
                            if (theme.en) theme.en = JSON.parse(theme.en);
                        } catch (e) {
                            console.warn('Erreur parsing theme localization:', e.message);
                        }
                        return theme;
                    });
                }

                // Parse POI coordinates
                if (circuit.pois && Array.isArray(circuit.pois)) {
                    circuit.pois = circuit.pois.map(poi => {
                        if (typeof poi.coordinates === 'string') {
                            try {
                                poi.coordinates = JSON.parse(poi.coordinates);
                            } catch (e) {
                                console.warn('Erreur parsing POI coordinates:', e.message);
                            }
                        }
                        if (typeof poi.practicalInfo === 'string') {
                            try {
                                poi.practicalInfo = JSON.parse(poi.practicalInfo);
                            } catch (e) {
                                console.warn('Erreur parsing POI practicalInfo:', e.message);
                            }
                        }
                        return poi;
                    });
                }

                return circuit;
            });

            return res.status(200).json({
                success: true,
                message: 'Circuits récupérés avec succès',
                data: processedCircuits
            });
        }

        // Otherwise, return paginated response
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 12;
        const offset = (pageNum - 1) * limitNum;

        // Get total count
        const totalCount = await Circuit.count({
            where: { ...whereClause, ...searchCondition },
            include: includes,
            distinct: true
        });

        // Get circuits with pagination
        const circuits = await Circuit.findAll({
            where: { ...whereClause, ...searchCondition },
            include: includes,
            limit: limitNum,
            offset: offset,
            order: orderClause,
            subQuery: false,
            distinct: true
        });

        // Process circuits (parse JSON localizations)
        const processedCircuits = circuits.map(circuitInstance => {
            const circuit = circuitInstance.toJSON();

            // Parse circuit localizations
            try {
                if (circuit.ar) circuit.ar = JSON.parse(circuit.ar);
                if (circuit.fr) circuit.fr = JSON.parse(circuit.fr);
                if (circuit.en) circuit.en = JSON.parse(circuit.en);
            } catch (e) {
                console.warn('Erreur parsing circuit localization:', e.message);
            }

            // Parse theme localizations
            if (circuit.themes && Array.isArray(circuit.themes)) {
                circuit.themes = circuit.themes.map(theme => {
                    try {
                        if (theme.ar) theme.ar = JSON.parse(theme.ar);
                        if (theme.fr) theme.fr = JSON.parse(theme.fr);
                        if (theme.en) theme.en = JSON.parse(theme.en);
                    } catch (e) {
                        console.warn('Erreur parsing theme localization:', e.message);
                    }
                    return theme;
                });
            }

            // Parse POI coordinates
            if (circuit.pois && Array.isArray(circuit.pois)) {
                circuit.pois = circuit.pois.map(poi => {
                    if (typeof poi.coordinates === 'string') {
                        try {
                            poi.coordinates = JSON.parse(poi.coordinates);
                        } catch (e) {
                            console.warn('Erreur parsing POI coordinates:', e.message);
                        }
                    }
                    if (typeof poi.practicalInfo === 'string') {
                        try {
                            poi.practicalInfo = JSON.parse(poi.practicalInfo);
                        } catch (e) {
                            console.warn('Erreur parsing POI practicalInfo:', e.message);
                        }
                    }
                    return poi;
                });
            }

            return circuit;
        });

        const totalPages = Math.ceil(totalCount / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Circuits récupérés avec succès',
            data: {
                circuits: processedCircuits,
                totalCount,
                currentPage: pageNum,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('❌ Erreur récupération circuits filtrés:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Récupérer les circuits par thème (pour l'app mobile - comportement original)
exports.getCircuitsByTheme = async (req, res) => {
    const {
        themeId, 
        cityId, 
        latitude, 
        longitude, 
        sortBy = 'newest' 
    } = req.query;

    const limitPerTheme = 10; 
    let whereClause = { isDeleted: false };
    let orderClause = [];
    let includePoisForNearest = false; 
    let havingClause = null;

    try {
        if (!themeId) {
            return res.status(400).json({ 
                status: 'fail', 
                message: 'Le paramètre themeId est requis pour cette recherche.' 
            });
        }
        
        if (cityId) {
            whereClause.cityId = cityId;
        }

        // Logique de tri
        switch (sortBy) {
            case 'popular':
                orderClause.push(['reviewCount', 'DESC']);
                break;
            case 'rating':
                orderClause.push(['rating', 'DESC']);
                break;
            case 'nearest':
                if (latitude && longitude) {
                    includePoisForNearest = true; 
                    const poiLatitude = `CAST(JSON_UNQUOTE(JSON_EXTRACT(startPoi.coordinates, '$.latitude')) AS DECIMAL(10, 7))`;
                    const poiLongitude = `CAST(JSON_UNQUOTE(JSON_EXTRACT(startPoi.coordinates, '$.longitude')) AS DECIMAL(10, 7))`;
                    
                    const distanceFormula = literal(
                        `ST_Distance_Sphere(POINT(${poiLongitude}, ${poiLatitude}), POINT(${parseFloat(longitude)}, ${parseFloat(latitude)}))`
                    );
                    
                    orderClause.push([distanceFormula, 'ASC']);
                    havingClause = Circuit.sequelize.where(distanceFormula, { [Op.lte]: 2000 });
                }
                break;
            case 'newest':
            default:
                orderClause.push(['createdAt', 'DESC']);
                break;
        }

        const themeIds = themeId.split(',').slice(0, 3);
        let allCircuits = [];

        for (const tid of themeIds) {
            const themeWhereClause = {
                ...whereClause,
                '$themes.id$': tid
            };
            
            let includes = [
                { model: City, as: 'city', attributes: ['id', 'name', 'nameAr', 'nameEn'] },
                { model: Theme, as: 'themes', through: { attributes: [] }, where: { isDeleted: false }, required: true, attributes: ['id', 'fr', 'ar', 'en'] },
                { 
                    model: POI, as: 'pois', through: { attributes: ['order', 'estimatedTime'] },
                    where: { isDeleted: false }, required: false, 
                    include: [
                        { model: POILocalization, as: 'frLocalization', attributes: ['name'] },
                        { model: POILocalization, as: 'arLocalization', attributes: ['name'] },
                        { model: POILocalization, as: 'enLocalization', attributes: ['name'] }
                    ]
                }
            ];
            
            if (includePoisForNearest) {
                includes.push({
                    model: POI, 
                    as: 'startPoi', 
                    attributes: ['coordinates'],
                    required: true
                });
            }

            const circuits = await Circuit.findAll({
                where: themeWhereClause,
                limit: limitPerTheme, 
                subQuery: false, 
                include: includes, 
                order: orderClause,
                having: havingClause 
            });

            allCircuits = allCircuits.concat(circuits);
        }

        const processedCircuits = allCircuits.map(circuitInstance => {
            const circuit = circuitInstance.toJSON();
            
            try {
                if (circuit.ar) circuit.ar = JSON.parse(circuit.ar);
                if (circuit.fr) circuit.fr = JSON.parse(circuit.fr);
                if (circuit.en) circuit.en = JSON.parse(circuit.en);
            } catch (e) { 
                console.warn('Erreur parsing circuit localization:', e.message); 
            }

            if (circuit.themes && Array.isArray(circuit.themes)) {
                circuit.themes = circuit.themes.map(theme => {
                    try {
                        if (theme.ar) theme.ar = JSON.parse(theme.ar);
                        if (theme.fr) theme.fr = JSON.parse(theme.fr);
                        if (theme.en) theme.en = JSON.parse(theme.en);
                    } catch (e) { 
                        console.warn('Erreur parsing theme localization:', e.message); 
                    }
                    return theme;
                });
            }

            return circuit;
        });

        return res.status(200).json({
            status: 'success',
            data: processedCircuits
        });

    } catch (error) {
        console.error('❌ Erreur récupération circuits par thème:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Erreur serveur',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// TODO: 


// Récupérer un circuit par ID
exports.getCircuitById = async (req, res) => {
  try {
    const { id } = req.params;

    const circuit = await Circuit.findOne({
      where: { id, isDeleted: false },
      include: [
        {
          model: City,
          as: 'city'
        },
        {
          model: Theme,
          as: 'themes',
          through: { attributes: [] },
          where: { isDeleted: false },
          required: false
        },
        {
          model: POI,
          as: 'pois',
          through: {
            attributes: ['order', 'estimatedTime']
          },
          where: { isDeleted: false },
          required: false,
          include: [
            { model: POILocalization, as: 'frLocalization' },
            { model: POILocalization, as: 'arLocalization' },
            { model: POILocalization, as: 'enLocalization' },
            { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
          ]
        },
        {
          model: Review,
          as: 'reviews',
          where: { isDeleted: false },
          required: false,
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'profileImage'] }]
        }
      ]
    });

    if (!circuit) {
      return res.status(404).json({
        status: 'fail',
        message: 'Circuit non trouvé'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: circuit
    });
  } catch (error) {
    console.error('❌ Erreur récupération circuit:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ajouter un POI à un circuit
exports.addPOIToCircuit = async (req, res) => {
  try {
    const { circuitId, poiId, order, estimatedTime } = req.body;

    if (!circuitId || !poiId) {
      return res.status(400).json({
        success: false,
        message: 'circuitId et poiId sont requis'
      });
    }

    // Vérifier que le circuit et le POI existent
    const circuit = await Circuit.findOne({ where: { id: circuitId, isDeleted: false } });
    const poi = await POI.findOne({ where: { id: poiId, isDeleted: false } });

    if (!circuit) {
      return res.status(404).json({
        success: false,
        message: 'Circuit non trouvé'
      });
    }

    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI non trouvé'
      });
    }

    // Vérifier si la liaison existe déjà
    const existing = await CircuitPOI.findOne({
      where: { circuitId, poiId }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ce POI est déjà associé à ce circuit'
      });
    }

    // Créer la liaison
    const circuitPOI = await CircuitPOI.create({
      circuitId,
      poiId,
      order: order || null,
      estimatedTime: estimatedTime || null
    });

    return res.status(201).json({
      success: true,
      message: 'POI ajouté au circuit avec succès',
      data: circuitPOI
    });
  } catch (error) {
    console.error('❌ Erreur ajout POI au circuit:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Retirer un POI d'un circuit
exports.removePOIFromCircuit = async (req, res) => {
  try {
    const { circuitId, poiId } = req.params;

    const deleted = await CircuitPOI.destroy({
      where: { circuitId, poiId }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Liaison non trouvée'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'POI retiré du circuit avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur retrait POI du circuit:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mettre à jour un circuit
exports.updateCircuit = async (req, res) => {
  try {
    const { id } = req.params;
    let circuitData = req.body;
    let themeIds = req.body.themeIds || req.body.themeId;
    let poiIds = req.body.poiIds;

    // Parser les données si elles viennent en FormData
    if (req.body.data) {
      try {
        const parsedData = JSON.parse(req.body.data);
        themeIds = parsedData.themeIds || parsedData.themeId;
        poiIds = parsedData.poiIds;
        circuitData = parsedData;
      } catch (e) {
        console.error("Erreur parsing JSON:", e);
        if (req.file) await deleteFile(req.file.filename);
        return res.status(400).json({
          status: 'error',
          message: 'Format de données invalide'
        });
      }
    }

    // Vérifier que le circuit existe
    const circuit = await Circuit.findByPk(id);
    if (!circuit || circuit.isDeleted) {
      if (req.file) await deleteFile(req.file.filename);
      return res.status(404).json({
        status: 'fail',
        message: 'Circuit non trouvé'
      });
    }

    const sanitizedData = {};

    // Gérer les localisations
    if (circuitData.localizations) {
      if (circuitData.localizations.ar) {
        sanitizedData.ar = {
          name: xss(circuitData.localizations.ar.name || ''),
          description: xss(circuitData.localizations.ar.description || '')
        };
      }
      if (circuitData.localizations.fr) {
        sanitizedData.fr = {
          name: xss(circuitData.localizations.fr.name || ''),
          description: xss(circuitData.localizations.fr.description || '')
        };
      }
      if (circuitData.localizations.en) {
        sanitizedData.en = {
          name: xss(circuitData.localizations.en.name || ''),
          description: xss(circuitData.localizations.en.description || '')
        };
      }
    }

    // Gérer les autres champs
    if (circuitData.duration !== undefined) {
      sanitizedData.duration = circuitData.duration ? Number(circuitData.duration) : null;
    }
    if (circuitData.distance !== undefined) {
      sanitizedData.distance = circuitData.distance ? Number(circuitData.distance) : null;
    }
    if (circuitData.startPoint !== undefined) {
      sanitizedData.startPoint = circuitData.startPoint || null;
    }
    if (circuitData.endPoint !== undefined) {
      sanitizedData.endPoint = circuitData.endPoint || null;
    }
    if (circuitData.isPremium !== undefined) {
      sanitizedData.isPremium = circuitData.isPremium === 'true' || circuitData.isPremium === true;
    }
    if (circuitData.price !== undefined) {
      sanitizedData.price = circuitData.price ? Number(circuitData.price) : null;
    }
    if (circuitData.rating !== undefined) {
      sanitizedData.rating = circuitData.rating ? Number(circuitData.rating) : null;
    }
    if (circuitData.reviewCount !== undefined) {
      sanitizedData.reviewCount = circuitData.reviewCount ? Number(circuitData.reviewCount) : 0;
    }
    if (circuitData.cityId) {
      sanitizedData.cityId = circuitData.cityId;
    }
    if (circuitData.isActive !== undefined) {
      sanitizedData.isActive = circuitData.isActive === 'true' || circuitData.isActive === true;
    }

    // Gérer l'upload de l'image
    if (req.file) {
      if (circuit.imagePublicId) {
        console.log(`🗑️ Suppression image Cloudinary ancienne: ${circuit.imagePublicId}`);
        await deleteFile(circuit.imagePublicId).catch(err =>
          console.warn('⚠️ Erreur suppression ancienne image:', err)
        );
      }
      sanitizedData.image = req.file.path;
      sanitizedData.imagePublicId = req.file.filename;
    }

    // Mettre à jour le circuit
    await circuit.update(sanitizedData);

    // Mettre à jour les thèmes
    if (themeIds !== undefined) {
      if (Array.isArray(themeIds) && themeIds.length > 0) {
        const finalThemeIds = themeIds
          .map(t => (typeof t === 'object' && t !== null) ? t.id : t)
          .filter(Boolean);
        
        const themes = await Theme.findAll({
          where: {
            id: finalThemeIds,
            isDeleted: false
          }
        });
        
        await circuit.setThemes(themes);
      } else {
        await circuit.setThemes([]);
      }
    }

    // Mettre à jour les POIs
    if (poiIds !== undefined) {
      if (Array.isArray(poiIds) && poiIds.length > 0) {
        // Supprimer les anciennes liaisons
        await CircuitPOI.destroy({ where: { circuitId: id } });

        // Vérifier que les POIs existent
        const pois = await POI.findAll({
          where: {
            id: poiIds,
            isDeleted: false
          }
        });

        // Créer les nouvelles liaisons avec ordre
        for (let i = 0; i < poiIds.length; i++) {
          const poiId = typeof poiIds[i] === 'object' ? poiIds[i].poiId || poiIds[i].id : poiIds[i];
          const poiExists = pois.find(p => p.id === poiId);
          
          if (poiExists) {
            await CircuitPOI.create({
              circuitId: id,
              poiId: poiId,
              order: i + 1,
              estimatedTime: typeof poiIds[i] === 'object' ? poiIds[i].estimatedTime : null
            });
          }
        }
      } else {
        await CircuitPOI.destroy({ where: { circuitId: id } });
      }
    }

    // Récupérer le circuit mis à jour
    const updatedCircuit = await Circuit.findByPk(id, {
      include: [
        {
          model: City,
          as: 'city'
        },
        {
          model: Theme,
          as: 'themes',
          through: { attributes: [] },
          where: { isDeleted: false },
          required: false
        },
        {
          model: POI,
          as: 'pois',
          through: {
            attributes: ['order', 'estimatedTime']
          },
          where: { isDeleted: false },
          required: false,
          include: [
            { model: POILocalization, as: 'frLocalization', attributes: ['name'] }
          ]
        }
      ]
    });

    return res.status(200).json({
      status: 'success',
      data: updatedCircuit
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour circuit:', error);
    
    // Supprimer l'image uploadée en cas d'erreur
    if (req.file) {
      await deleteFile(req.file.filename).catch(err =>
        console.warn('⚠️ Erreur suppression image après échec:', err)
      );
    }

    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Suppression logique d'un circuit
exports.deleteCircuit = async (req, res) => {
  try {
    const { id } = req.params;

    const circuit = await Circuit.findByPk(id);
    if (!circuit || circuit.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Circuit non trouvé'
      });
    }

    // Suppression logique
    await circuit.update({ isDeleted: true });

    // Optionnel: Supprimer l'image Cloudinary
    if (circuit.imagePublicId) {
      console.log(`🗑️ Suppression image Cloudinary: ${circuit.imagePublicId}`);
      await deleteFile(circuit.imagePublicId).catch(err =>
        console.warn('⚠️ Erreur suppression image:', err)
      );
    }

    return res.status(200).json({
      status: 'success',
      message: 'Circuit supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression circuit:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};