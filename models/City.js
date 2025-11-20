const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const City = sequelize.define('City', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    nameAr: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    nameEn: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Image de la ville (URL ou nom de fichier)',
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    coordinates: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    radius: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
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
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
    },
}, {
    tableName: 'cities',
    timestamps: true,
});

City.associate = (models) => {
    City.hasMany(models.Circuit, {
        foreignKey: 'cityId',
        as: 'circuits',
    });
};


module.exports = { City };
