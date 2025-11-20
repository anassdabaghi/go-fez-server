const express = require('express');
const { body } = require('express-validator');
const multer = require("multer");
const path = require('path');
const router = express.Router();
const CityController = require('../controllers/CityController');
const { uploadImage, uploadCityFiles } = require("../Config/cloudinary");
// middleware/auth.js 
// const authenticateJWT = (req, res, next) => {
//     next(); 
// };

router.post('/',uploadCityFiles.single('image') ,CityController.createCity);

router.get('/', CityController.getAllCities);

router.put('/:id',uploadCityFiles.single('image') , CityController.updateCity);
router.delete('/:id', CityController.deleteCity);
module.exports = router;