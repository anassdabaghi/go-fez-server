const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const Theme = sequelize.define('Theme', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    // Localizations (nom et description en 3 langues)
    ar: {
        type: DataTypes.JSON, // Exemple: { name: "...", desc: "..." }
        allowNull: false,
        comment: 'Nom et description en arabe',
    },
    fr: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Nom et description en français',
    },
    en: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Nom et description en anglais',
    },

    icon: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Icône du thème (URL ou nom de fichier)',
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Image du thème (URL ou nom de fichier)',
    },
    imagePublicId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Public ID de l\'image pour la suppression Cloudinary',
  },
  iconPublicId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Public ID de l\'icône pour la suppression Cloudinary',
  },    
  
    color: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Couleur principale du thème (ex: #FF5733)',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'themes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});




module.exports = { Theme };
