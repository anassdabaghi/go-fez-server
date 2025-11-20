
const { Theme, Circuit, POI } = require('../models');
const { Op, Sequelize } = require('sequelize');
const xss = require('xss');
const { deleteFile } = require("../Config/cloudinary");

// Helper to sanitize inputs
const sanitizeThemeLocalizations = (localizations) => {
    const data = {};
    if (localizations.ar) data.ar = { name: xss(localizations.ar.name || ''), desc: xss(localizations.ar.desc || '') };
    if (localizations.fr) data.fr = { name: xss(localizations.fr.name || ''), desc: xss(localizations.fr.desc || '') };
    if (localizations.en) data.en = { name: xss(localizations.en.name || ''), desc: xss(localizations.en.desc || '') };
    return data;
};

exports.createTheme = async (req, res) => {
    const iconFile = req.files?.icon ? req.files.icon[0] : null;
    const imageFile = req.files?.image ? req.files.image[0] : null;
    
    try {
        const { data } = req.body;
        if (!data) return res.status(400).json({ status: 'fail', message: 'Le champ de données (data) est manquant.' });
        
        const themeData = JSON.parse(data);
        const { localizations, color, isActive } = themeData;

        if (!localizations || !localizations.ar || !localizations.fr || !localizations.en || !color) {
            return res.status(400).json({ status: 'fail', message: 'Champs de données requis manquants.' });
        }

        if (!imageFile || !iconFile) {
            if (iconFile) await deleteFile(iconFile.filename || iconFile.public_id).catch(console.error);
            if (imageFile) await deleteFile(imageFile.filename || imageFile.public_id).catch(console.error);
            return res.status(400).json({ status: 'fail', message: "L'image et l'icône sont requises." });
        }
        
        const sanitizedLocalizations = sanitizeThemeLocalizations(localizations);
        const imageUrl = imageFile.path || imageFile.url || imageFile.location;
        const iconUrl = iconFile.path || iconFile.url || iconFile.location;
        const imagePublicId = imageFile.filename || imageFile.public_id;
        const iconPublicId = iconFile.filename || iconFile.public_id;

        const theme = await Theme.create({
            ...sanitizedLocalizations, 
            color: xss(color),
            isActive: isActive === 'true' || isActive === true,
            isDeleted: false,
            image: imageUrl, 
            imagePublicId: imagePublicId, 
            icon: iconUrl,
            iconPublicId: iconPublicId
        });
        
        return res.status(201).json({ status: 'success', data: theme });
    } catch (error) {
        console.error('❌ Erreur création thème :', error);
        return res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

exports.getAllThemes = async (req, res) => {
    try {
        const { page, limit, search, isActive, sortBy } = req.query;

        if (!page && !limit) {
            const themes = await Theme.findAll({
                where: { isDeleted: false },
                include: [{
                    model: Circuit,
                    as: 'circuitsFromThemes',
                    through: { attributes: [] },
                    attributes: ['id']
                }],
                order: [['id', 'ASC']]
            });
            const data = themes.map(theme => ({
                ...theme.toJSON(),
                circuitsCount: theme.circuitsFromThemes?.length || 0
            }));
            return res.status(200).json({ status: 'success', data });
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;
        const whereClause = { isDeleted: false };
        const searchConditions = [];

        if (search) {
            const searchPattern = `%${search}%`;
            searchConditions.push(
                Theme.sequelize.where(Theme.sequelize.cast(Theme.sequelize.col('Theme.fr'), 'CHAR'), { [Op.like]: searchPattern }),
                Theme.sequelize.where(Theme.sequelize.cast(Theme.sequelize.col('Theme.ar'), 'CHAR'), { [Op.like]: searchPattern }),
                Theme.sequelize.where(Theme.sequelize.cast(Theme.sequelize.col('Theme.en'), 'CHAR'), { [Op.like]: searchPattern })
            );
        }

        if (isActive !== undefined) whereClause.isActive = isActive === 'true';

        const finalWhere = searchConditions.length > 0 ? { ...whereClause, [Op.or]: searchConditions } : whereClause;

        let orderClause = [['id', 'ASC']];
        if (sortBy === 'newest') orderClause = [['createdAt', 'DESC']];
        else if (sortBy === 'oldest') orderClause = [['createdAt', 'ASC']];
        else if (sortBy === 'name') orderClause = [['fr', 'ASC']];

        const { count, rows } = await Theme.findAndCountAll({
            where: finalWhere,
            limit: limitNum,
            offset: offset,
            include: [{
                model: Circuit,
                as: 'circuitsFromThemes',
                through: { attributes: [] },
                attributes: ['id']
            }],
            order: orderClause,
            distinct: true
        });

        const themesWithCount = rows.map(theme => ({
            ...theme.toJSON(),
            circuitsCount: theme.circuitsFromThemes?.length || 0
        }));

        res.status(200).json({
            status: 'success',
            data: themesWithCount,
            pagination: {
                totalCount: count,
                currentPage: pageNum,
                totalPages: Math.ceil(count / limitNum),
                limit: limitNum
            }
        });
    } catch (error) {
        console.error('❌ Erreur getAllThemes:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};


exports.getThemeById = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            search, 
            sortBy,  
            maxDistance, 
            transportMode 
        } = req.query;

        // Debug Logs
        console.log(`🔍 [getThemeById] ID: ${id}`);
        console.log(`🔍 [getThemeById] Filters:`, { search, sortBy, maxDistance, transportMode });

        // 1. Build Circuit Filters
        // Default checks (Active & Not Deleted)
        const circuitWhere = {
            isActive: true,
            isDeleted: false,
        };

        // Filter by Distance
        if (maxDistance && !isNaN(parseFloat(maxDistance))) {
            circuitWhere.distance = { [Op.lte]: parseFloat(maxDistance) };
        }

        // Filter by "Walking" mode (Fallback: Distance <= 10km)
        if (transportMode === 'walking') {
            if (!maxDistance || parseFloat(maxDistance) > 10) {
                circuitWhere.distance = { [Op.lte]: 10 };
            }
        }

        // Filter by Search
        if (search) {
            const searchTerm = `%${xss(search)}%`;
            console.log(`🔍 [getThemeById] Applying Search Term: ${searchTerm}`);
            
            circuitWhere[Op.or] = [
                Sequelize.where(Sequelize.cast(Sequelize.col('circuitsFromThemes.fr'), 'CHAR'), { [Op.like]: searchTerm }),
                Sequelize.where(Sequelize.cast(Sequelize.col('circuitsFromThemes.en'), 'CHAR'), { [Op.like]: searchTerm }),
                Sequelize.where(Sequelize.cast(Sequelize.col('circuitsFromThemes.ar'), 'CHAR'), { [Op.like]: searchTerm })
            ];
        }

        // 2. Determine Sorting
        let circuitOrder = [['createdAt', 'DESC']]; 
        if (sortBy === 'popular') {
            circuitOrder = [['reviewCount', 'DESC']];
        }

        // 3. Fetch Theme
        const theme = await Theme.findOne({
            where: { id: id, isDeleted: false },
            include: [
                {
                    model: Circuit,
                    as: 'circuitsFromThemes',
                    where: circuitWhere, 
                    required: false, 
                    through: { attributes: [] },
                    include: [
                        { 
                            model: POI, 
                            as: 'pois', 
                            attributes: ['id'],
                            through: { attributes: [] } 
                        }
                    ]
                }
            ],
            order: [
                [{ model: Circuit, as: 'circuitsFromThemes' }, ...circuitOrder[0]]
            ]
        });

        if (!theme) {
            return res.status(404).json({ status: 'fail', message: 'Thème introuvable' });
        }

        // 4. Response
        const themeData = theme.toJSON();
        
        themeData.circuits = (themeData.circuitsFromThemes || []).map(circuit => {
            ['fr', 'en', 'ar'].forEach(lang => {
                if (typeof circuit[lang] === 'string') {
                    try { circuit[lang] = JSON.parse(circuit[lang]); } catch(e) {}
                }
            });
            return circuit;
        });
        
        delete themeData.circuitsFromThemes;

        res.status(200).json({ status: 'success', data: themeData });

    } catch (error) {
        console.error('❌ Erreur getThemeById:', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

exports.updateTheme = async (req, res) => {
    const { id } = req.params;
    const iconFile = req.files?.icon ? req.files.icon[0] : null;
    const imageFile = req.files?.image ? req.files.image[0] : null;

    try {
        const theme = await Theme.findByPk(id);
        if (!theme || theme.isDeleted) return res.status(404).json({ status: 'fail', message: 'Thème introuvable' });
        
        let themeData = req.body;
        if (req.body.data) {
            try { themeData = JSON.parse(req.body.data); } catch (e) { return res.status(400).json({ message: 'JSON invalide' }); }
        }

        const sanitizedData = {};
        if (themeData.localizations) Object.assign(sanitizedData, sanitizeThemeLocalizations(themeData.localizations));
        if (themeData.color) sanitizedData.color = xss(themeData.color);
        if (themeData.isActive !== undefined) sanitizedData.isActive = themeData.isActive === 'true' || themeData.isActive === true;

        if (iconFile) {
            if (theme.iconPublicId) await deleteFile(theme.iconPublicId);
            sanitizedData.icon = iconFile.path || iconFile.url || iconFile.location;
            sanitizedData.iconPublicId = iconFile.filename || iconFile.public_id;
        }
        if (imageFile) {
            if (theme.imagePublicId) await deleteFile(theme.imagePublicId);
            sanitizedData.image = imageFile.path || imageFile.url || imageFile.location;
            sanitizedData.imagePublicId = imageFile.filename || imageFile.public_id;
        } 
        
        await theme.update(sanitizedData);
        const updatedTheme = await Theme.findByPk(id); 
        return res.status(200).json({ status: 'success', data: updatedTheme });
        
    } catch (error) {
        console.error('❌ Erreur mise à jour thème :', error);
        return res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};

exports.deleteTheme = async (req, res) => {
    try {
        const theme = await Theme.findByPk(req.params.id);
        if (!theme || theme.isDeleted) return res.status(404).json({ status: 'fail', message: 'Thème introuvable' });
        
        if (theme.imagePublicId) await deleteFile(theme.imagePublicId).catch(console.error);
        if (theme.iconPublicId) await deleteFile(theme.iconPublicId).catch(console.error);
        
        await theme.update({ isDeleted: true });
        return res.status(200).json({ status: 'success', message: 'Thème supprimé avec succès' });
    } catch (error) {
        console.error('❌ Erreur suppression thème :', error);
        return res.status(500).json({ status: 'error', message: 'Erreur serveur', error: error.message });
    }
};