const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { uploadCategoryFiles } = require('../Config/cloudinary.js');

router.post('/', uploadCategoryFiles.single('icon'), categoryController.createCategory);
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', uploadCategoryFiles.single('icon'), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
