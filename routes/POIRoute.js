const express = require('express');
const { body } = require('express-validator');
const {
  handleValidationErrors,
  createPOIWithFiles,
  findAllPOIs,
  findOnePOI,
  updatePOI,
  deletePOI,
    getPOIsForParcoursLibre,
    getTravelTime
} = require('../controllers/POIController.js');
const { 
    uploadImage, 
    uploadAudio, 
    uploadVideo, 
    uploadVirtualTour 
} = require('../Config/cloudinary');
const { POI } = require('../models/index.js');

// Middleware personnalisé pour gérer les uploads multiples
const uploadMultipleFiles = (req, res, next) => {
  const multer = require('multer');
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
  });

  const fields = [
    { name: 'image', maxCount: 10 }, // Autoriser plusieurs images
    { name: 'video', maxCount: 10 }, // Autoriser plusieurs vidéos
    { name: 'fr_audio', maxCount: 1 },
    { name: 'ar_audio', maxCount: 1 },
    { name: 'en_audio', maxCount: 1 }
  ];

  upload.fields(fields)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Erreur lors de l\'upload des fichiers',
        error: err.message
      });
    }
    next();
  });
};

const POIRouter = express.Router();

// Routes d'upload Cloudinary
POIRouter.post('/upload/image', uploadImage.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier image fourni'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Image uploadée avec succès',
            imageUrl: req.file.path,
            publicId: req.file.filename
        });
    } catch (error) {
        console.error('Erreur lors de l\'upload de l\'image:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'upload de l\'image'
        });
    }
});

POIRouter.post('/upload/audio', uploadAudio.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier audio fourni'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Audio uploadé avec succès',
            audioUrl: req.file.path,
            publicId: req.file.filename
        });
    } catch (error) {
        console.error('Erreur lors de l\'upload de l\'audio:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'upload de l\'audio'
        });
    }
});

POIRouter.post('/upload/video', uploadVideo.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier vidéo fourni'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Vidéo uploadée avec succès',
            videoUrl: req.file.path,
            publicId: req.file.filename
        });
    } catch (error) {
        console.error('Erreur lors de l\'upload de la vidéo:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'upload de la vidéo'
        });
    }
});

POIRouter.post('/upload/virtual-tour', uploadVirtualTour.single('virtualTour'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier de visite virtuelle fourni'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Visite virtuelle uploadée avec succès',
            virtualTourUrl: req.file.path,
            publicId: req.file.filename
        });
    } catch (error) {
        console.error('Erreur lors de l\'upload de la visite virtuelle:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'upload de la visite virtuelle'
        });
    }
});

POIRouter.get('/parcours-libre', getPOIsForParcoursLibre);
POIRouter.get('/travel-time', getTravelTime);
// Routes principales des POI
POIRouter.get('/', findAllPOIs);

// Route pour récupérer un POI par ID
POIRouter.get('/:id', findOnePOI);

// Route pour créer un POI avec upload de fichiers
POIRouter.post(
  '/create-with-files',
  uploadMultipleFiles,
  [
    body('coordinates')
      .isString()
      .withMessage('Les coordonnées doivent être une chaîne JSON valide'),
    body('category')
      .isUUID()
      .withMessage('La catégorie doit être un UUID valide'),
    body('cityId')
      .isUUID()
      .withMessage('L\'ID de la ville doit être un UUID valide'),
    body('practicalInfo')
      .optional()
      .isString()
      .withMessage('Les informations pratiques doivent être une chaîne JSON valide'),
    body('arLocalization')
      .optional()
      .isString()
      .withMessage('La localisation arabe doit être une chaîne JSON valide'),
    body('frLocalization')
      .optional()
      .isString()
      .withMessage('La localisation française doit être une chaîne JSON valide'),
    body('enLocalization')
      .optional()
      .isString()
      .withMessage('La localisation anglaise doit être une chaîne JSON valide'),
    handleValidationErrors
  ],
  createPOIWithFiles
);

// Route pour mettre à jour un POI
POIRouter.put(
  '/:id',
  uploadMultipleFiles,
  [
    body('coordinates')
      .optional()
      .isString()
      .withMessage('Les coordonnées doivent être une chaîne JSON valide'),
    body('category')
      .optional()
      .isUUID()
      .withMessage('La catégorie doit être un UUID valide'),
    body('cityId')
      .optional()
      .isUUID()
      .withMessage('L\'ID de la ville doit être un UUID valide'),
    body('practicalInfo')
      .optional()
      .isString()
      .withMessage('Les informations pratiques doivent être une chaîne JSON valide'),
    handleValidationErrors
  ],
  updatePOI
);

// Route pour supprimer un POI (suppression logique)
POIRouter.delete('/:id', deletePOI);


module.exports = { POIRouter };