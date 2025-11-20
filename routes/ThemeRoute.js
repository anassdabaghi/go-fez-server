const express = require('express');
const router = express.Router();
const ThemeController = require('../controllers/ThemeController');
const { uploadThemeFiles } = require("../Config/cloudinary");


router.post('/create-with-files', uploadThemeFiles.fields([
    { name: 'image', maxCount: 1 },
    { name: 'icon', maxCount: 1 }
]), ThemeController.createTheme);

router.get('/', ThemeController.getAllThemes);
router.get('/:id', ThemeController.getThemeById);
router.put('/:id', uploadThemeFiles.fields([
  { name: 'image', maxCount: 1 },
  { name: 'icon', maxCount: 1 }]),ThemeController.updateTheme);
router.delete('/:id', ThemeController.deleteTheme);

module.exports = router;
