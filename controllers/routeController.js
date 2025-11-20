const { 
    Route, 
    Circuit, 
    POI, 
    VisitedTrace, 
    RemovedTrace,
    City,
    Theme,
    POILocalization,
    Album,
    AlbumPOI,
    POIFile,
    User
} = require('../models');
const { awardPOIVisit, awardCircuitCompletion } = require('../services/GamificationService');

const { Op, literal } = require('sequelize');
const Sequelize = require('sequelize'); 

// ====================================================================
// 1. Démarrer une nouvelle Route (POST /routes/start)
// ====================================================================
exports.startRoute = async (req, res) => {
    // 1. Extraction des données. On suppose que userId vient du token d'authentification.
    const { circuitId, longitude, latitude, pois } = req.body;
    const userId = req.user.userId; 

    if (!circuitId || !latitude || !longitude) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'circuitId, longitude, latitude sont requis.' 
        });
    }

    try {
        
        // 1.2 Vérification de l'existence du Circuit original
        const circuit = await Circuit.findOne({
              where: { id: circuitId , isDeleted: false },
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
                    { model: POILocalization, as: 'enLocalization' }
                  ]
                }
              ]
            });

        if (!circuit) {
            return res.status(404).json({ 
                status: 'fail', 
                message: 'Le Circuit original est introuvable.' 
            });
        }

        let idOfPoi = (pois && pois.length > 0) ? pois[0] : null;

        // 1.3 Création du nouvel enregistrement Route
        const newRoute = await Route.create({
            userId: req.user.userId,
            circuitId,
            isCompleted: false,
            endPoint: circuit.endPoint
        });

        // 1.4 Création de la première trace (obligatoire)
        const newVisitedTrace = await VisitedTrace.create({
            routeId: newRoute.id,
            latitude,
            longitude,
            idPoi: idOfPoi 
        });
        
        return res.status(200).json({
            status: true,
            message: 'Route démarrée avec succès. Première trace enregistrée.',
            data: { 
                circuit, 
                firstTrace: newVisitedTrace,
                isRouteCompleted: false
            }
        });

    } catch (error) {
        console.error('Erreur au démarrage de la Route:', error);
        return res.status(500).json({ 
            status: false, 
            message: 'Erreur interne du serveur.' 
        });
    }
};

// ====================================================================
// 1.b Obtenir une Route par ID (GET /routes/:id)
//    - Retourne: POIs du circuit NON retirés (selon RemovedTrace du routeId)
//      et toutes les visitedTraces de la route
// ====================================================================
exports.getRouteById = async (req, res) => {
    try {
        const { id } = req.params; // routeId
        const userId = req.user.userId;

        console.log('🔍 getRouteById called for routeId:', id, 'userId:', userId);

        // 0) Vérifier l'existence de la route (et l'appartenance à l'utilisateur)
        const route = await Route.findOne({
            where: { id, userId },
            include: [
                {
                    model: Circuit,
                    as: 'circuit',
                    required: false,
                    include: [
                        { model: City, as: 'city', required: false }
                    ]
                }
            ]
        });
        
        if (!route) {
            return res.status(404).json({ status: false, message: 'Route introuvable.' });
        }

        console.log('✅ Route found:', { id: route.id, circuitId: route.circuitId, poiId: route.poiId });

        const isCircuitRoute = route.circuitId !== null;

        let poisNotRemoved = [];
        let allCircuitPois = [];
        let removedTraces = [];

        if (isCircuitRoute) {
            // 1) Récupérer tous les POIs d'origine du circuit
            const circuitWithPois = await Circuit.findByPk(route.circuitId, {
                include: [{
                    model: POI,
                    as: 'pois',
                    through: { attributes: ['order', 'estimatedTime'] },
                    required: false,
                    include: [
                        { model: POILocalization, as: 'frLocalization' },
                        { model: POILocalization, as: 'arLocalization' },
                        { model: POILocalization, as: 'enLocalization' },
                        { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
                    ]
                }]
            });

            if (!circuitWithPois) {
                return res.status(404).json({ status: false, message: 'Circuit non trouvé pour cette route.' });
            }

            // 2) Récupérer les POIs retirés pour cette route
            removedTraces = await RemovedTrace.findAll({
                where: { routeId: id },
                attributes: ['poiId', 'createdAt']
            });
            const removedPoiIds = removedTraces.map(t => t.poiId);

            // 3) Return ALL circuit POIs (not just non-removed ones) for map display
            allCircuitPois = (circuitWithPois.pois || []).map((p) => {
                const po = p.toJSON ? p.toJSON() : p;
                const initialImage = Array.isArray(po.files) && po.files.length > 0
                    ? (po.files.find((f) => f?.type === 'image')?.fileUrl || po.files[0]?.fileUrl)
                    : null;
                return { ...po, initialImage };
            });
            
            // Keep poisNotRemoved for backward compatibility
            poisNotRemoved = allCircuitPois.filter(p => !removedPoiIds.includes(p.id));
        } else if (route.poiId) {
            // For navigation routes, fetch the target POI
            const targetPoi = await POI.findByPk(route.poiId, {
                include: [
                    { model: POILocalization, as: 'frLocalization' },
                    { model: POILocalization, as: 'arLocalization' },
                    { model: POILocalization, as: 'enLocalization' },
                    { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
                ]
            });

            if (targetPoi) {
                const po = targetPoi.toJSON ? targetPoi.toJSON() : targetPoi;
                const initialImage = Array.isArray(po.files) && po.files.length > 0
                    ? (po.files.find((f) => f?.type === 'image')?.fileUrl || po.files[0]?.fileUrl)
                    : null;
                allCircuitPois = [{ ...po, initialImage }];
            }
        }

        // 4) Récupérer les visitedTraces de la route avec les données POI
        const visitedTraces = await VisitedTrace.findAll({
            where: { routeId: id },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: POI,
                    as: 'poi',
                    required: false,
                    include: [
                        { model: POILocalization, as: 'frLocalization' },
                        { model: POILocalization, as: 'arLocalization' },
                        { model: POILocalization, as: 'enLocalization' },
                        { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
                    ]
                }
            ]
        });

        console.log('✅ Returning route data:', {
            isCircuitRoute,
            allPoisCount: allCircuitPois.length,
            visitedTracesCount: visitedTraces.length,
            removedTracesCount: removedTraces.length
        });

        return res.status(200).json({
            status: true,
            message: 'Détails de la route récupérés avec succès.',
            data: {
                route: route.toJSON(),
                visitedTraces: visitedTraces.map(vt => ({
                    id: vt.id,
                    routeId: vt.routeId,
                    latitude: parseFloat(vt.latitude),
                    longitude: parseFloat(vt.longitude),
                    poiId: vt.poiId || vt.idPoi,
                    createdAt: vt.createdAt,
                    poi: vt.poi
                })),
                removedTraces: removedTraces.map(rt => rt.toJSON()),
                pois: allCircuitPois, // Return all circuit POIs for proper map display
            }
        });
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de la route:', error);
        console.error('❌ Error stack:', error.stack);
        return res.status(500).json({ status: false, message: 'Erreur interne du serveur.' });
    }
};

// Create album 

const createAlbumOnCompletion = async (route, userId) => {
    
    const newAlbum = await Album.create({
        name: `Circuit Album: ${route.circuitId} (${new Date().toLocaleDateString()})`,
        userId: userId,
    });
    
    const visitedPoisRecords = await VisitedTrace.findAll({
        where: { routeId: route.id, idPoi: { [Op.ne]: null } },
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('idPoi')), 'poiId']]
    });
    const visitedPoiIds = visitedPoisRecords.map(p => p.dataValues.poiId);

    if (visitedPoiIds.length === 0) {

        return { album: newAlbum, count: 0 };
    }

    const albumFiles = await POIFile.findAll({
        where: {
            poiId: { [Op.in]: visitedPoiIds },
            type: 'imageAlbum'
        },
        attributes: ['id', 'poiId'] 
    });

    const albumPOIData = albumFiles.map(file => ({
        albumId: newAlbum.id,
        poiFileId: file.id,
    }));

    let createdCount = 0;
    if (albumPOIData.length > 0) {
        const newAlbumPOIRecords = await AlbumPOI.bulkCreate(albumPOIData);
        createdCount = newAlbumPOIRecords.length;
    }

    return { album: newAlbum, createdCount };
};


// ====================================================================
// 2. Enregistrer la trace GPS et/ou la visite de POI (POST /routes/trace)
// ====================================================================
exports.addVisitedTrace = async (req, res) => {
    const { routeId, longitude, latitude, pois } = req.body;
    const userId = req.user.userId; 

    if (!routeId || !longitude || !latitude) {
        return res.status(400).json({ 
            status: 'fail', 
            message: 'routeId, longitude et latitude sont requis.' 
        });
    }

    try {
        // 1. Vérification de la Route
        const route = await Route.findOne({
            where: { id: routeId, userId: userId, isCompleted: false }
        });
        
        if (!route) {
            return res.status(404).json({ 
                status: 'fail', 
                message: 'Route introuvable ou déjà complétée/annulée.' 
            });
        }

        let idOfPoi = (pois && pois.length > 0) ? pois[0] : null;

        // 2. Création de l'enregistrement VisitedTrace
        const newTrace = await VisitedTrace.create({
            routeId,
            longitude,
            latitude,
            idPoi: idOfPoi
        });
        
        // =========================================================
        // 3. LOGIQUE DE VÉRIFICATION D'AUTO-COMPLÉTION (FINAL)
        // =========================================================
        let isRouteCompleted = false;

        // N'exécuter la logique de vérification complète que si un POI a été signalé
        if (idOfPoi) {
            
            // A. Obtenir tous les POIs originaux du Circuit
            const circuitWithPois = await Circuit.findByPk(route.circuitId, {
                include: [{
                    model: POI,
                    as: 'pois', // Assurez-vous que cette association est définie dans Circuit.js
                    attributes: ['id'],
                    through: { attributes: [] }
                }]
            });
            
            if (!circuitWithPois) {
                return res.status(404).json({ status: 'fail', message: 'Circuit non trouvé.' });
            }

            const allOriginalPoiIds = circuitWithPois.pois.map(p => p.id);
            
            // B. Identifier les POIs retirés
            const removedTraces = await RemovedTrace.findAll({
                where: { userId: userId, circuitId: route.circuitId },
                attributes: ['poiId']
            });
            const removedPoiIds = removedTraces.map(t => t.poiId);

            // C. Déterminer les POIs REQUIs (Originals - Removed)
            const requiredPoiIds = allOriginalPoiIds.filter(id => 
                !removedPoiIds.includes(id)
            );

            // D. Déterminer les POIs VISITÉS (Uniques)
            const visitedPoisRecords = await VisitedTrace.findAll({
                where: { routeId: route.id, idPoi: { [Op.ne]: null } },
                // Utiliser DISTINCT pour ne compter qu'une seule visite par POI
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('idPoi')), 'poiId']] 
            });
            // Convertir le résultat en un tableau simple d'IDs
            const visitedPoiIds = visitedPoisRecords.map(p => p.dataValues.poiId);
            
            // E. Comparaison Finale: Le nombre de POIs visités correspond-il aux POIs requis?
            if (requiredPoiIds.length > 0 && requiredPoiIds.length === visitedPoiIds.length) {
                // Vérifier qu'AUCUN POI requis n'a été manqué
                const allRequiredVisited = requiredPoiIds.every(id => visitedPoiIds.includes(id));
                
                if (allRequiredVisited) {
                    isRouteCompleted = true;
                }
            }
        }
        
        // 4. Mise à jour de la Route si complétée

        let createdAlbum = null;
        let pointsAwarded = null;
        if (isRouteCompleted) {
            await Route.update(
                { isCompleted: true, completedAt: new Date() },
                { where: { id: route.id } } 
            );

            // Award gamification points for circuit completion
            try {
                // Récupérer le circuit pour obtenir isPremium
                const circuit = await Circuit.findByPk(route.circuitId, {
                    attributes: ['id', 'isPremium']
                });
                
                if (circuit) {
                    const awardResult = await awardCircuitCompletion(userId, circuit.id, circuit.isPremium || false);
                    if (awardResult && awardResult.success) {
                        pointsAwarded = {
                            totalPoints: awardResult.totalPoints,
                            pointsAwarded: awardResult.pointsAwarded
                        };
                    }
                }
            } catch (awardError) {
                console.error('Error awarding circuit completion:', awardError);
            }

            try {
                const albumResult = await createAlbumOnCompletion(route, userId);
                createdAlbum = albumResult.album;
                console.log(`Album créé : ${createdAlbum.id}, avec ${albumResult.createdCount} fichiers attachés.`);
            } catch (albumError) {
                console.error("Erreur lors de la création de l'Album:", albumError);
            }
        }
        

        // 5. Préparation de la réponse (Récupérer toutes les traces pour le contexte du front-end)
        const visitedTraces = await VisitedTrace.findAll({ where: { routeId: route.id } });

        return res.status(200).json({
            status: true,
            message: isRouteCompleted ? 'Route complétée et Album créé.' : 'Trace enregistrée avec succès.',
            data: {
                newTrace: newTrace, 
                visitedTraces: visitedTraces,
                isRouteCompleted: isRouteCompleted,
                albumId: createdAlbum ? createdAlbum.id : null,
                pointsAwarded: pointsAwarded
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de la trace:', error);
        return res.status(500).json({ status: false, message: 'Erreur interne du serveur.' });
    }
};


// ====================================================================
// 5. Retirer un POI de la Route (POST /routes/remove-poi)
// ====================================================================
exports.removePOIFromRoute = async (req, res) => {

    const { routeId, poiId } = req.body;
    const userId = req.user.userId;

    if (!routeId || !poiId) {
        return res.status(400).json({
            status: 'fail',
            message: 'routeId et poiId sont requis.'
        });
    }

    try {

        const route = await Route.findOne({
            where: { id: routeId, userId: userId, isCompleted: false },
            attributes: ['id', 'circuitId']
        });

        if (!route) {
            return res.status(404).json({
                status: 'fail',
                message: 'Route introuvable, complétée ou n\'appartient pas à cet utilisateur.'
            });
        }
        
        const circuitId = route.circuitId;
        const isPoiInCircuit = await Circuit.findOne({
            where: { id: circuitId },
            include: [{
                model: POI,
                as: 'pois',
                where: { id: poiId },
                required: true 
            }]
        });

        if (!isPoiInCircuit) {
             return res.status(404).json({
                status: 'fail',
                message: 'Ce POI n\'est pas initialement dans ce Circuit.'
            });
        }
        
        const existingRemoval = await RemovedTrace.findOne({
            where: {
                userId: userId,
                routeId: routeId,
                poiId: poiId
            }
        });

        if (existingRemoval) {
            return res.status(200).json({
                status: true,
                message: 'Le POI est déjà marqué comme retiré pour cette Route.',
                data: { removedTrace: existingRemoval }
            });
        }

        const newRemovedTrace = await RemovedTrace.create({
            userId: userId,
            routeId: routeId, 
            poiId: poiId
        });
        
        let isRouteCompleted = false;

        const circuitWithPois = await Circuit.findByPk(circuitId, {
            include: [{
                model: POI,
                as: 'pois',
                attributes: ['id'],
                through: { attributes: [] }
            }]
        });

        const allOriginalPoiIds = circuitWithPois.pois.map(p => p.id);

        const removedTraces = await RemovedTrace.findAll({
            where: { routeId: routeId }, 
            attributes: ['poiId']
        });
        const removedPoiIds = removedTraces.map(t => t.poiId);

        const requiredPoiIds = allOriginalPoiIds.filter(id =>
            !removedPoiIds.includes(id)
        );

        const visitedPoisRecords = await VisitedTrace.findAll({
            where: { routeId: routeId, idPoi: { [Op.ne]: null } },
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('idPoi')), 'poiId']]
        });
        const visitedPoiIds = visitedPoisRecords.map(p => p.dataValues.poiId);

        if (requiredPoiIds.length > 0 && requiredPoiIds.length <= visitedPoiIds.length) { 
            const allRequiredVisited = requiredPoiIds.every(id => visitedPoiIds.includes(id));

            if (allRequiredVisited) {
                isRouteCompleted = true;
            }
        }

        let createdAlbum = null;
        if (isRouteCompleted) {
            await Route.update(
                { isCompleted: true },
                { where: { id: route.id } }
            );

            try {
                const albumResult = await createAlbumOnCompletion(route, userId);
                createdAlbum = albumResult.album;
            } catch (albumError) {
                console.error("Erreur lors de la création de l'Album après suppression:", albumError);
            }
        }

        return res.status(200).json({
            status: true,
            message: isRouteCompleted ? 'POI retiré. Route complétée et Album créé.' : 'POI retiré de la Route avec succès. Vérification d\'auto-complétion effectuée.',
            data: {
                removedTrace: newRemovedTrace,
                isRouteCompleted: isRouteCompleted,
                albumId: createdAlbum ? createdAlbum.id : null
            }
        });

    } catch (error) {
        console.error('Erreur lors du retrait du POI de la Route:', error);
        return res.status(500).json({
            status: false,
            message: 'Erreur interne du serveur.'
        });
    }
};

// ====================================================================
// 6. Rajouter un POI à la Route (POST /routes/add-poi)
// ====================================================================
exports.addPOIToRoute = async (req, res) => {
    const { routeId, poiId } = req.body;
    const userId = req.user.userId;

    if (!routeId || !poiId) {
        return res.status(400).json({
            status: 'fail',
            message: 'routeId et poiId sont requis.'
        });
    }

    try {
        const route = await Route.findOne({
            where: { id: routeId, userId: userId, isCompleted: false },
            attributes: ['id', 'circuitId']
        });

        if (!route) {
            return res.status(404).json({
                status: 'fail',
                message: 'Route introuvable, complétée ou n\'appartient pas à cet utilisateur.'
            });
        }
        
        const circuitId = route.circuitId;
        const isPoiInCircuit = await Circuit.findOne({
            where: { id: circuitId },
            include: [{
                model: POI,
                as: 'pois',
                where: { id: poiId },
                required: true 
            }]
        });

        if (!isPoiInCircuit) {
            return res.status(404).json({
                status: 'fail',
                message: 'Ce POI n\'est pas initialement dans ce Circuit.'
            });
        }
        
        const existingRemoval = await RemovedTrace.findOne({
            where: {
                userId: userId,
                routeId: routeId,
                poiId: poiId
            }
        });

        if (!existingRemoval) {
            return res.status(200).json({
                status: true,
                message: 'Le POI n\'était pas retiré de cette Route.',
                data: { removedTrace: null }
            });
        }

        await existingRemoval.destroy();
        
        // Vérifier si la route doit être marquée comme non complétée
        // (si elle était complétée uniquement parce que ce POI était retiré)
        const circuitWithPois = await Circuit.findByPk(circuitId, {
            include: [{
                model: POI,
                as: 'pois',
                attributes: ['id'],
                through: { attributes: [] }
            }]
        });

        const allOriginalPoiIds = circuitWithPois.pois.map(p => p.id);

        const removedTraces = await RemovedTrace.findAll({
            where: { routeId: routeId }, 
            attributes: ['poiId']
        });
        const removedPoiIds = removedTraces.map(t => t.poiId);

        const requiredPoiIds = allOriginalPoiIds.filter(id =>
            !removedPoiIds.includes(id)
        );

        const visitedPoisRecords = await VisitedTrace.findAll({
            where: { routeId: routeId, idPoi: { [Op.ne]: null } },
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('idPoi')), 'poiId']]
        });
        const visitedPoiIds = visitedPoisRecords.map(p => p.dataValues.poiId);

        // Si la route était complétée mais maintenant il y a plus de POIs requis que visités, la marquer comme non complétée
        if (route.isCompleted && requiredPoiIds.length > visitedPoiIds.length) {
            await Route.update(
                { isCompleted: false },
                { where: { id: route.id } }
            );
        }

        return res.status(200).json({
            status: true,
            message: 'POI rajouté à la Route avec succès.',
            data: {
                removedTrace: null
            }
        });

    } catch (error) {
        console.error('Erreur lors du rajout du POI à la Route:', error);
        return res.status(500).json({
            status: false,
            message: 'Erreur interne du serveur.'
        });
    }
};


// ====================================================================
// NEW: Save a completed navigation route (POST /routes/save)
// ====================================================================
exports.saveRoute = async (req, res) => {
    const userId = req.user.userId;
    const {
        poiId,
        poiName,
        poiImage,
        startLocation,
        endLocation,
        distance,
        duration,
        transportMode,
        routeGeoJSON,
        pointsEarned
    } = req.body;

    // Validation
    if (!poiId || !startLocation || !endLocation || !distance || !duration) {
        return res.status(400).json({
            status: false,
            message: 'Missing required fields: poiId, startLocation, endLocation, distance, duration'
        });
    }

    try {
        // Create the saved route
        const savedRoute = await Route.create({
            userId,
            poiId,
            poiName,
            poiImage,
            startLocation,
            endLocation,
            distance,
            duration,
            transportMode: transportMode || 'foot',
            routeGeoJSON,
            pointsEarned: pointsEarned || 100,
            isCompleted: true,
            completedAt: new Date()
        });

        // Update user points if gamification system exists
        try {
            const UserPoints = require('../models').UserPoints;
            if (UserPoints && pointsEarned) {
                // Try to find existing user points record
                let userPoints = await UserPoints.findOne({ where: { userId } });
                
                if (userPoints) {
                    // Update existing record
                    await userPoints.update({
                        totalPoints: userPoints.totalPoints + pointsEarned
                    });
                } else {
                    // Create new record if doesn't exist
                    await UserPoints.create({
                        userId,
                        totalPoints: pointsEarned,
                        level: 1
                    });
                }
            }
        } catch (pointsError) {
            console.error('Error updating user points:', pointsError);
            // Continue even if points update fails
        }

        return res.status(201).json({
            status: true,
            message: 'Route saved successfully!',
            data: savedRoute
        });

    } catch (error) {
        console.error('Error saving route:', error);
        return res.status(500).json({
            status: false,
            message: 'Error saving route',
            error: error.message
        });
    }
};

// ====================================================================
// NEW: Get user's saved routes with statistics (GET /routes/user)
// ====================================================================
exports.getUserRoutes = async (req, res) => {
    const userId = req.user.userId;
    console.log('🔍 getUserRoutes called for userId:', userId);

    try {
        console.log('📊 Fetching routes from database...');
        // Get all completed routes for the user (both navigation and circuit-based)
        const routes = await Route.findAll({
            where: {
                userId,
                isCompleted: true
            },
            include: [
                {
                    model: Circuit,
                    as: 'circuit',
                    required: false,
                    attributes: ['id', 'fr', 'en', 'ar', 'image', 'cityId', 'distance', 'duration'],
                    include: [
                        { 
                            model: City, 
                            as: 'city', 
                            required: false,
                            attributes: ['id', 'name', 'nameEn', 'nameAr']
                        }
                    ]
                },
                {
                    model: VisitedTrace,
                    as: 'visitedTraces',
                    required: false,
                    attributes: ['id', 'latitude', 'longitude', 'idPoi', 'createdAt'],
                    include: [
                        {
                            model: POI,
                            as: 'poi',
                            required: false,
                            attributes: ['id', 'coordinates'],
                            include: [
                                { model: POILocalization, as: 'frLocalization', attributes: ['name'] },
                                { model: POILocalization, as: 'enLocalization', attributes: ['name'] },
                                { model: POILocalization, as: 'arLocalization', attributes: ['name'] }
                            ]
                        }
                    ]
                },
                {
                    model: RemovedTrace,
                    as: 'removedTraces',
                    required: false,
                    attributes: ['id', 'poiId', 'createdAt'],
                    include: [
                        {
                            model: POI,
                            as: 'poi',
                            required: false,
                            attributes: ['id', 'coordinates'],
                            include: [
                                { model: POILocalization, as: 'frLocalization', attributes: ['name'] },
                                { model: POILocalization, as: 'enLocalization', attributes: ['name'] },
                                { model: POILocalization, as: 'arLocalization', attributes: ['name'] }
                            ]
                        }
                    ]
                }
            ],
            order: [['completedAt', 'DESC']],
            attributes: [
                'id',
                'circuitId',
                'poiId',
                'poiName',
                'poiImage',
                'startLocation',
                'endLocation',
                'distance',
                'duration',
                'transportMode',
                'routeGeoJSON',
                'pointsEarned',
                'completedAt',
                'createdAt'
            ]
        });

        console.log(`✅ Found ${routes.length} routes for user ${userId}`);

        // Get circuit POI counts for all circuit-based routes
        const circuitIds = routes
            .filter(route => route.circuitId)
            .map(route => route.circuitId);
        
        console.log(`🔗 Circuit IDs found: ${circuitIds.length > 0 ? circuitIds.join(', ') : 'none'}`);
        
        const circuitPOICounts = {};
        if (circuitIds.length > 0) {
            console.log('🔢 Fetching POI counts for circuits...');
            const db = require('../Config/db');
            const sequelize = db.getSequelize();
            const { CircuitPOI } = require('../models');
            const poiCounts = await CircuitPOI.findAll({
                where: { circuitId: circuitIds },
                attributes: [
                    'circuitId',
                    [sequelize.fn('COUNT', sequelize.col('poiId')), 'count']
                ],
                group: ['circuitId'],
                raw: true
            });
            
            console.log('📊 POI counts result:', poiCounts);
            
            poiCounts.forEach(row => {
                circuitPOICounts[row.circuitId] = parseInt(row.count);
            });
            console.log('✅ Circuit POI counts:', circuitPOICounts);
        }

        console.log('🔄 Formatting routes...');
        
        // Format routes with comprehensive information
        const formattedRoutes = routes.map((route, index) => {
            const routeData = route.toJSON();
            
            // Parse JSON strings for circuit localization if they exist
            if (routeData.circuit) {
                try {
                    if (typeof routeData.circuit.fr === 'string') {
                        routeData.circuit.fr = JSON.parse(routeData.circuit.fr);
                    }
                    if (typeof routeData.circuit.en === 'string') {
                        routeData.circuit.en = JSON.parse(routeData.circuit.en);
                    }
                    if (typeof routeData.circuit.ar === 'string') {
                        routeData.circuit.ar = JSON.parse(routeData.circuit.ar);
                    }
                } catch (e) {
                    console.error('Error parsing circuit JSON:', e);
                }
            }
            
            // Calculate POI statistics for circuit-based routes
            const visitedPOIs = routeData.visitedTraces || [];
            const removedPOIs = routeData.removedTraces || [];
            
            // Filter to only count actual POIs (not GPS tracking points)
            const actualVisitedPOIs = visitedPOIs.filter(vt => vt.poi && vt.idPoi);
            const actualRemovedPOIs = removedPOIs.filter(rt => rt.poi && rt.poiId);
            
            // Determine route type
            const isCircuitRoute = routeData.circuitId !== null;
            
            let totalPOIs = 0;
            let completionPercentage = 0;
            
            if (isCircuitRoute && routeData.circuit) {
                // Get total POIs from the circuit
                totalPOIs = circuitPOICounts[routeData.circuitId] || 0;
                const processedPOIs = actualVisitedPOIs.length + actualRemovedPOIs.length;
                completionPercentage = totalPOIs > 0 ? Math.min(100, Math.round((processedPOIs / totalPOIs) * 100)) : 0;
            }
            
            return {
                id: routeData.id,
                type: isCircuitRoute ? 'circuit' : 'navigation',
                
                // Circuit information
                circuit: isCircuitRoute && routeData.circuit ? {
                    id: routeData.circuit.id,
                    name: routeData.circuit.fr?.name || routeData.circuit.en?.name || routeData.circuit.ar?.name || 'Unknown Circuit',
                    cityName: routeData.circuit.city?.name || routeData.circuit.city?.nameEn || routeData.circuit.city?.nameAr || null,
                    image: routeData.circuit.image
                } : null,
                
                // POI information (for navigation routes)
                poiId: routeData.poiId,
                poiName: routeData.poiName,
                poiImage: routeData.poiImage,
                
                // Route details
                startLocation: routeData.startLocation,
                endLocation: routeData.endLocation,
                distance: routeData.distance || (routeData.circuit?.distance ? parseFloat(routeData.circuit.distance) : 0),
                duration: routeData.duration || (routeData.circuit?.duration ? parseFloat(routeData.circuit.duration) : 0),
                transportMode: routeData.transportMode,
                routeGeoJSON: routeData.routeGeoJSON,
                
                // Statistics
                pointsEarned: routeData.pointsEarned || 0,
                totalPOIs: totalPOIs,
                visitedCount: actualVisitedPOIs.length,
                removedCount: actualRemovedPOIs.length,
                remainingCount: Math.max(0, totalPOIs - actualVisitedPOIs.length - actualRemovedPOIs.length),
                completionPercentage: completionPercentage,
                tracesCount: actualVisitedPOIs.length,
                
                // Timestamps
                completedAt: routeData.completedAt,
                createdAt: routeData.createdAt,
                
                // Detailed POI arrays with names (filter to only include actual POIs)
                visitedPOIs: actualVisitedPOIs.map(vt => ({
                        id: vt.id,
                        latitude: vt.latitude,
                        longitude: vt.longitude,
                        timestamp: vt.createdAt,
                        name: vt.poi.frLocalization?.name || vt.poi.enLocalization?.name || vt.poi.arLocalization?.name || 'POI'
                    })),
                removedPOIs: actualRemovedPOIs.map(rt => ({
                    id: rt.id,
                    poiId: rt.poiId,
                    timestamp: rt.createdAt,
                    name: rt.poi.frLocalization?.name || rt.poi.enLocalization?.name || rt.poi.arLocalization?.name || 'POI'
                }))
            };
        });

        console.log(`✅ Formatted ${formattedRoutes.length} routes`);
        
        // Calculate overall statistics
        const totalPoints = formattedRoutes.reduce((sum, route) => sum + (route.pointsEarned || 0), 0);
        const totalDistance = formattedRoutes.reduce((sum, route) => sum + (route.distance || 0), 0);
        const totalRoutes = formattedRoutes.length;
        const totalPOIsVisited = formattedRoutes.reduce((sum, route) => sum + (route.visitedCount || 0), 0);
        const totalPOIsRemoved = formattedRoutes.reduce((sum, route) => sum + (route.removedCount || 0), 0);

        console.log('📈 Statistics:', { totalPoints, totalDistance, totalRoutes, totalPOIsVisited, totalPOIsRemoved });
        console.log('✅ Sending response to client');

        return res.status(200).json({
            status: true,
            message: 'User routes retrieved successfully',
            data: {
                routes: formattedRoutes,
                stats: {
                    totalPoints,
                    totalRoutes,
                    totalDistance,
                    totalPOIsVisited,
                    totalPOIsRemoved,
                    circuitRoutes: formattedRoutes.filter(r => r.type === 'circuit').length,
                    navigationRoutes: formattedRoutes.filter(r => r.type === 'navigation').length
                }
            }
        });

    } catch (error) {
        console.error('❌ Error getting user routes:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ SQL:', error.sql);
        return res.status(500).json({
            status: false,
            message: 'Error retrieving user routes',
            error: error.message
        });
    }
};


exports.getAllRoutes = async (req, res) => {
      try {
            const search = req.query.search || '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Condition de recherche dans le JSON si search est fourni
            const whereCircuit = search
      ? Sequelize.literal(`
            JSON_UNQUOTE(JSON_EXTRACT(circuit.fr, '$.name')) LIKE '%${search}%'
            OR JSON_UNQUOTE(JSON_EXTRACT(circuit.ar, '$.name')) LIKE '%${search}%'
            OR JSON_UNQUOTE(JSON_EXTRACT(circuit.en, '$.name')) LIKE '%${search}%'
      `)
                  : {};

            const routesResult = await Route.findAndCountAll({
      include: [
            {
                  model: Circuit,
                  as: 'circuit',
                  required: !!search,
                  where: whereCircuit,
                  include: [
                        { model: City, as: 'city', required: false }
                  ]
            },
            {
                  model: User,
                  as: 'user',
                  required: false,
                  attributes: ['id', 'firstName', 'lastName', 'email']
            },
            {
                  model: POI,
                  as: 'navigationPOI',
                  required: false,
                  include: [
                        { model: City, as: 'city', required: false }
                  ]
            }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
});

            // Parse circuit JSON strings before sending response
            const formattedRoutes = routesResult.rows.map(route => {
                  const routeData = route.toJSON();
                  
                  // Parse JSON strings for circuit localization if they exist
                  if (routeData.circuit) {
                        try {
                              if (typeof routeData.circuit.fr === 'string') {
                                    routeData.circuit.fr = JSON.parse(routeData.circuit.fr);
                              }
                              if (typeof routeData.circuit.en === 'string') {
                                    routeData.circuit.en = JSON.parse(routeData.circuit.en);
                              }
                              if (typeof routeData.circuit.ar === 'string') {
                                    routeData.circuit.ar = JSON.parse(routeData.circuit.ar);
                              }
                        } catch (e) {
                              console.error('Error parsing circuit JSON:', e);
                        }
                  }
                  
                  return routeData;
            });

            return res.status(200).json({
                  status: true,
                  message: "Liste des routes récupérée avec succès.",
                  pagination: {
                        total: routesResult.count,
                        currentPage: page,
                        totalPages: Math.ceil(routesResult.count / limit)
                  },
                  data: formattedRoutes
            });

      } catch (error) {
            console.error("Erreur lors de la récupération des Routes:", error);
            return res.status(500).json({
                  status: false,
                  message: "Erreur serveur lors de la récupération des routes.",
                  error: error.message
            });
      }
};

// ====================================================================
// NEW: Get detailed route information for admin (GET /routes/admin/:id)
// ====================================================================
exports.getRouteDetailAdmin = async (req, res) => {
    try {
        const { id } = req.params; // routeId
        console.log('🔍 Getting route detail for ID:', id);

        // Get the route with user and circuit info (circuit may be null for navigation routes)
        const route = await Route.findOne({
            where: { id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: Circuit,
                    as: 'circuit',
                    required: false, // Make circuit optional
                    include: [
                        {
                            model: City,
                            as: 'city',
                            required: false
                        },
                        {
                            model: POI,
                            as: 'pois',
                            through: { attributes: ['order', 'estimatedTime'] },
                            where: { isDeleted: false },
                            required: false,
                            include: [
                                { model: POILocalization, as: 'frLocalization' },
                                { model: POILocalization, as: 'arLocalization' },
                                { model: POILocalization, as: 'enLocalization' },
                                { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!route) {
            console.log('❌ Route not found');
            return res.status(404).json({ status: false, message: 'Route introuvable.' });
        }

        console.log('✅ Route found:', {
            id: route.id,
            circuitId: route.circuitId,
            userId: route.userId,
            isCompleted: route.isCompleted
        });

        // Check if this is a circuit-based route or a navigation route
        const isCircuitRoute = !!route.circuitId;
        console.log('🔄 Route type:', isCircuitRoute ? 'Circuit-based' : 'Navigation');
        
        // Get all visited traces ordered by timestamp
        console.log('📍 Fetching visited traces...');
        const visitedTraces = await VisitedTrace.findAll({
            where: { routeId: id },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: POI,
                    as: 'poi',
                    required: false,
                    include: [
                        { model: POILocalization, as: 'frLocalization' },
                        { model: POILocalization, as: 'arLocalization' },
                        { model: POILocalization, as: 'enLocalization' },
                        { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
                    ]
                }
            ]
        });
        console.log(`✅ Found ${visitedTraces.length} visited traces`);
        
        // Log POI IDs from visited traces for debugging
        const tracesWithPOIs = visitedTraces.filter(t => t.idPoi);
        console.log(`📍 Traces with POI IDs: ${tracesWithPOIs.length}`, tracesWithPOIs.map(t => ({
            id: t.id,
            idPoi: t.idPoi,
            hasPoiData: !!t.poi
        })));

        // Get removed POIs for this route
        console.log('🗑️ Fetching removed traces...');
        const removedTraces = await RemovedTrace.findAll({
            where: { routeId: id },
            include: [
                {
                    model: POI,
                    as: 'poi',
                    required: false,
                    include: [
                        { model: POILocalization, as: 'frLocalization' },
                        { model: POILocalization, as: 'arLocalization' },
                        { model: POILocalization, as: 'enLocalization' },
                        { model: POIFile, as: 'files', where: { type: 'image' }, required: false }
                    ]
                }
            ]
        });
        console.log(`✅ Found ${removedTraces.length} removed traces`);

        // Categorize POIs based on route type
        console.log('🔄 Categorizing POIs...');
        let visitedPois = [];
        let removedPois = [];
        let remainingPois = [];
        let allCircuitPois = [];
        
        if (isCircuitRoute && route.circuit) {
            console.log('📋 Processing circuit-based route');
            // Circuit-based route
            const removedPoiIds = removedTraces.map(t => t.poiId);
            
            // Get unique visited POI IDs from idPoi field
            const visitedPoiIds = [...new Set(
                visitedTraces
                    .filter(t => t.idPoi)
                    .map(t => t.idPoi)
            )];
            
            console.log(`🔍 Found ${visitedPoiIds.length} unique visited POI IDs:`, visitedPoiIds);
            
            allCircuitPois = route.circuit.pois || [];
            console.log(`Circuit has ${allCircuitPois.length} POIs`);
            
            visitedPois = allCircuitPois.filter(p => visitedPoiIds.includes(p.id));
            removedPois = removedTraces.map(t => t.poi).filter(Boolean);
            remainingPois = allCircuitPois.filter(p => 
                !visitedPoiIds.includes(p.id) && !removedPoiIds.includes(p.id)
            );
            console.log(`POIs: ${visitedPois.length} visited, ${removedPois.length} removed, ${remainingPois.length} remaining`);
        } else {
            console.log('🗺️ Processing navigation route');
            // Navigation route - get unique POIs from visited traces
            const uniquePois = new Map();
            visitedTraces.forEach(trace => {
                if (trace.poi && trace.idPoi) {
                    uniquePois.set(trace.idPoi, trace.poi);
                }
            });
            visitedPois = Array.from(uniquePois.values());
            removedPois = [];
            remainingPois = [];
            console.log(`Found ${visitedPois.length} unique POIs from traces`);
        }

        // Get user's current location (most recent visited trace)
        const currentLocation = visitedTraces.length > 0 
            ? visitedTraces[visitedTraces.length - 1]
            : null;

        // Calculate statistics
        const totalDistance = visitedTraces.length > 1
            ? visitedTraces.reduce((total, trace, index) => {
                if (index === 0) return 0;
                const prev = visitedTraces[index - 1];
                const lat1 = parseFloat(prev.latitude);
                const lon1 = parseFloat(prev.longitude);
                const lat2 = parseFloat(trace.latitude);
                const lon2 = parseFloat(trace.longitude);
                
                // Haversine formula
                const R = 6371; // Earth's radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                         Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return total + (R * c);
            }, 0)
            : 0;

        const duration = visitedTraces.length > 1
            ? (new Date(visitedTraces[visitedTraces.length - 1].createdAt) - 
               new Date(visitedTraces[0].createdAt)) / (1000 * 60) // in minutes
            : 0;

        // Calculate completion percentage
        const effectiveTotalPOIs = allCircuitPois.length - removedPois.length;
        const completionPercentage = effectiveTotalPOIs > 0 
            ? Math.min(100, Math.round((visitedPois.length / effectiveTotalPOIs) * 100))
            : 0;

        console.log('📊 Statistics calculated:', {
            totalDistance: totalDistance.toFixed(2),
            duration: Math.round(duration),
            tracesCount: visitedTraces.length,
            completionPercentage
        });

        console.log('✅ Sending response...');
        
        // Parse circuit JSON strings before sending
        let parsedCircuit = null;
        if (route.circuit) {
            parsedCircuit = {
                id: route.circuit.id,
                fr: typeof route.circuit.fr === 'string' ? JSON.parse(route.circuit.fr) : route.circuit.fr,
                ar: typeof route.circuit.ar === 'string' ? JSON.parse(route.circuit.ar) : route.circuit.ar,
                en: typeof route.circuit.en === 'string' ? JSON.parse(route.circuit.en) : route.circuit.en,
                city: route.circuit.city
            };
        }
        
        return res.status(200).json({
            status: true,
            message: 'Détails de la route récupérés avec succès.',
            data: {
                route: {
                    id: route.id,
                    circuitId: route.circuitId,
                    userId: route.userId,
                    isCompleted: route.isCompleted,
                    createdAt: route.createdAt,
                    completedAt: route.completedAt,
                    isCircuitRoute: isCircuitRoute,
                    // Navigation route specific fields
                    poiId: route.poiId,
                    poiName: route.poiName,
                    startLocation: route.startLocation,
                    endLocation: route.endLocation,
                    transportMode: route.transportMode,
                    user: route.user,
                    circuit: parsedCircuit
                },
                statistics: {
                    totalPOIs: allCircuitPois.length,
                    visitedCount: visitedPois.length,
                    removedCount: removedPois.length,
                    remainingCount: remainingPois.length,
                    totalDistance: totalDistance.toFixed(2),
                    duration: Math.round(duration),
                    tracesCount: visitedTraces.length,
                    completionPercentage: completionPercentage
                },
                visitedTraces: visitedTraces.map(t => ({
                    id: t.id,
                    latitude: parseFloat(t.latitude),
                    longitude: parseFloat(t.longitude),
                    idPoi: t.idPoi,
                    poi: t.poi,
                    createdAt: t.createdAt
                })),
                visitedPois: visitedPois.map(p => {
                    const poi = p.toJSON ? p.toJSON() : p;
                    return {
                        ...poi,
                        initialImage: poi.files?.[0]?.fileUrl || null
                    };
                }),
                removedPois: removedPois.map(p => {
                    const poi = p.toJSON ? p.toJSON() : p;
                    console.log('🗑️ Removed POI:', {
                        id: poi.id,
                        latitude: poi.latitude,
                        longitude: poi.longitude,
                        hasCoordinates: !!(poi.latitude && poi.longitude)
                    });
                    return {
                        ...poi,
                        initialImage: poi.files?.[0]?.fileUrl || null
                    };
                }),
                remainingPois: remainingPois.map(p => {
                    const poi = p.toJSON ? p.toJSON() : p;
                    return {
                        ...poi,
                        initialImage: poi.files?.[0]?.fileUrl || null
                    };
                }),
                currentLocation: currentLocation ? {
                    latitude: parseFloat(currentLocation.latitude),
                    longitude: parseFloat(currentLocation.longitude),
                    timestamp: currentLocation.createdAt
                } : null
            }
        });
    } catch (error) {
        console.error('❌ ERROR in getRouteDetailAdmin:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        return res.status(500).json({ 
            status: false, 
            message: 'Erreur interne du serveur.',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


