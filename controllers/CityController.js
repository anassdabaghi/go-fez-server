const { City } = require('../models');
const xss = require('xss');
const { deleteFile } = require("../Config/cloudinary");

//  Créer une ville avec upload d’image
exports.createCity = async (req, res) => {
    try {
        
    console.log('📁 Fichier image reçu:', req.file ? req.file.originalname : 'Aucun');
        const { name, nameAr, nameEn, country, radius, isActive, address, adressAr, adressEn, latitude, longitude } = req.body;

        if (!name || !nameAr || !nameEn || !country || !radius) {
            return res.status(400).json({ status: 'fail', message: 'Champs requis manquants' });
        }

        const coordinatesObject = {
            address: xss(address),
            addressAr: xss(adressAr), // Correction du nom de variable 'adressAr' dans le code original
            addressEn: xss(adressEn), // Correction du nom de variable 'adressEn' dans le code original
            longitude: longitude ? Number(longitude) : null,
            latitude: latitude ? Number(latitude) : null,
        };

        const sanitizedData = {
            name: xss(name),
            nameAr: xss(nameAr),
            nameEn: xss(nameEn),
            country: xss(country),
            radius: radius ? Number(radius) : null,
            coordinates: coordinatesObject,
            isActive: isActive === 'true' || isActive === true,
            isDeleted: false,
            image: req.file ? req.file.path : null, // URL
            imagePublicId: req.file ? req.file.filename : null // Public ID

        };
        console.log('🏗️ Création du city avec les données:', sanitizedData);

        const existingCity = await City.findOne({ where: { name: sanitizedData.name, isDeleted: false } });
        if (existingCity) {
            return res.status(409).json({ status: 'fail', message: 'Cette ville existe déjà sous ce nom anglais.' });
        }

        const city = await City.create(sanitizedData);
        res.status(201).json({ status: 'success', data: city });
    } catch (error) {
        console.error('Erreur création ville :', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur interne'});
    }
};

//  Récupérer toutes les villes avec filtres et recherche
exports.getAllCities = async (req, res) => {
  try {
    const { 
      page, 
      limit, 
      search = '', 
      country = '', 
      isActive,
      sortBy = 'name'
    } = req.query;

    // If no pagination params, return all cities (for dropdowns, etc.)
    if (!page && !limit) {
      const where = { isDeleted: false };
      const cities = await City.findAll({
        where,
        order: [['name', 'ASC']]
      });
      return res.status(200).json({
        status: 'success',
        data: cities
      });
    }

    const { Op } = require('sequelize');

    // Build where clause
    const where = { isDeleted: false };
    
    // Add filters
    if (country) where.country = country;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // Add search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { nameAr: { [Op.like]: `%${search}%` } },
        { nameEn: { [Op.like]: `%${search}%` } }
      ];
    }

    // Build order clause
    let orderClause = [];
    switch (sortBy) {
      case 'newest':
        orderClause.push(['createdAt', 'DESC']);
        break;
      case 'oldest':
        orderClause.push(['createdAt', 'ASC']);
        break;
      case 'name':
      default:
        orderClause.push(['name', 'ASC']);
        break;
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const totalCount = await City.count({ where });

    // Get cities with pagination
    const cities = await City.findAll({
      where,
      limit: parseInt(limit),
      offset: offset,
      order: orderClause
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      status: 'success',
      message: 'Villes récupérées avec succès',
      data: {
        cities,
        totalCount,
        currentPage: parseInt(page),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Erreur récupération villes :', error.message, error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Erreur serveur interne'
    });
  }
};


//  Mettre à jour une ville
exports.updateCity = async (req, res) => {
    try {
        const city = await City.findByPk(req.params.id);
        if (!city || city.isDeleted) {
            return res.status(404).json({ status: 'fail', message: 'Ville introuvable' });
        }

        const sanitizedData = {};
        if (req.body.name) sanitizedData.name = xss(req.body.name);
        if (req.body.nameAr) sanitizedData.nameAr = xss(req.body.nameAr);
        if (req.body.nameEn) sanitizedData.nameEn = xss(req.body.nameEn);
        if (req.body.country) sanitizedData.country = xss(req.body.country);
        if (req.body.radius) sanitizedData.radius = Number(req.body.radius);
            if (req.body.address || req.body.adressAr || req.body.adressEn || req.body.latitude || req.body.longitude) {    
            const updatedCoordinates = { ...city.coordinates };
            if (req.body.address) updatedCoordinates.address = xss(req.body.address);
            if (req.body.adressAr) updatedCoordinates.addressAr = xss(req.body.adressAr);
            if (req.body.adressEn) updatedCoordinates.addressEn = xss(req.body.adressEn);   
            if (req.body.latitude) updatedCoordinates.latitude = Number(req.body.latitude);
            if (req.body.longitude) updatedCoordinates.longitude = Number(req.body.longitude);
                
            sanitizedData.coordinates = updatedCoordinates;
        }
        if (req.body.isActive !== undefined)
            sanitizedData.isActive = req.body.isActive === 'true' || req.body.isActive === true;

        if (req.file) {
            if (city.imagePublicId) { 
                console.log(`🗑️ Suppression image Cloudinary ancienne: ${city.imagePublicId}`);
                await deleteFile(city.imagePublicId);
            }
            sanitizedData.image = req.file.path; 
            sanitizedData.imagePublicId = req.file.filename; 
        }

        await city.update(sanitizedData);
        res.status(200).json({ status: 'success', data: city });
    } catch (error) {
        console.error('Erreur mise à jour ville :', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur interne'});
    }
};

//  Suppression logique d’une ville
exports.deleteCity = async (req, res) => {
    try {
        const city = await City.findByPk(req.params.id);
        if (!city || city.isDeleted) {
            return res.status(404).json({ status: 'fail', message: 'Ville introuvable' });
        }
        if (city.imagePublicId) {
            console.log(`🗑️ Suppression image Cloudinary: ${city.imagePublicId}`);
            await deleteFile(city.imagePublicId);
        }

        await city.update({ isDeleted: true });
        res.status(200).json({ status: 'success', message: 'Ville supprimée avec succès' });
    } catch (error) {
        console.error('Erreur suppression ville :', error);
        res.status(500).json({ status: 'error', message: 'Erreur serveur interne' });
    }
};
