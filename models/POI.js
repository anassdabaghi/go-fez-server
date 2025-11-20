const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const POI = sequelize.define('POI', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false

    },
    ar: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'ar_localization_id',
        comment: 'Foreign key vers POILocalization pour la version arabe'
    },
    fr: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'fr_localization_id',
        comment: 'Foreign key vers POILocalization pour la version française'
    },
    en: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'en_localization_id',
        comment: 'Foreign key vers POILocalization pour la version anglaise'
    },
    coordinates: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Coordonnées géographiques {latitude, longitude, address}'
    },
    ownerId: {
            type: DataTypes.INTEGER, // Ou DataTypes.INTEGER si c'est le type de l'ID utilisateur
            allowNull: true,      // Ou false, selon votre logique
            field: 'ownerId'      // Assurez-vous que 'field' correspond au nom réel de la colonne
        },
    category: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID de la catégorie du POI'
    },
    practicalInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'practical_info',
        comment: 'Informations pratiques (horaires, prix, etc.)'
    },
    cityId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'city_id',
        comment: 'Foreign key vers la ville'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
        comment: 'POI actif ou non'
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_verified',
        comment: 'POI vérifié par les modérateurs'
    },
    isPremium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_premium',
        comment: 'POI premium'
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.00,
        validate: {
            min: 0,
            max: 5
        },
        comment: 'Note moyenne du POI (0-5)'
    },
    reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'review_count',
        validate: {
            min: 0
        },
        comment: 'Nombre d\'avis'
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isUserOwned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
    tableName: 'pois',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['category'],
            name: 'idx_poi_category'
        },
        {
            fields: ['city_id'],
            name: 'idx_poi_city'
        },
        {
            fields: ['is_active'],
            name: 'idx_poi_active'
        },
        {
            fields: ['is_verified'],
            name: 'idx_poi_verified'
        },
        {
            fields: ['is_premium'],
            name: 'idx_poi_premium'
        },
        {
            fields: ['rating'],
            name: 'idx_poi_rating'
        },
        {
            fields: ['ar_localization_id'],
            name: 'idx_poi_ar_localization'
        },
        {
            fields: ['fr_localization_id'],
            name: 'idx_poi_fr_localization'
        },
        {
            fields: ['en_localization_id'],
            name: 'idx_poi_en_localization'
        }
    ]
});

module.exports = { POI };