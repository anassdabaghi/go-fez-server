const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const POILocalization = sequelize.define('POILocalization', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: [0, 500]
        }
    },
    audioFiles: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string contenant les URLs des fichiers audio'
    },

    audioPublicIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'audio_public_ids',
        comment: 'JSON string contenant les Public IDs Cloudinary des fichiers audio'
    },
    
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'poi_localizations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['name'],
            name: 'idx_poi_localization_name'
        }
    ]
});

module.exports = { POILocalization };
