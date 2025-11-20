const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    poiId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID du POI si targetType est POI',
    },
    targetId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID générique pour relation polymorphique',
    },
    targetType: {
        type: DataTypes.ENUM('POI', 'CIRCUIT', 'SPACE'),
        allowNull: true, // Peut être null si poiId est utilisé
        comment: 'Type de l\'objet évalué (POI, CIRCUIT, ou SPACE)',
    },
    rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 5,
        },
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL de l\'image d\'accompagnement',
    },
    isAccepted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si l\'avis a été modéré et accepté',
    },
    aiRating: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Ancienne note en cas de modification',
    },
    // Le champ 'oiReport' dans votre schéma correspond probablement à un champ de rapport ou de modération.
   
    aiReport: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Rapport de modération/raison du rejet',
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Suppression logique de l\'avis',
    },
    photos: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URLs des photos (JSON array)',
    },
}, {
    tableName: 'reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Review;