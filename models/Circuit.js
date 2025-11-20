const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const sequelize = db.getSequelize();

const Circuit = sequelize.define('Circuit', {

  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
  },
  ar: {
    type: DataTypes.JSON,
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
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  imagePublicId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Public ID de l\'image pour la suppression Cloudinary',
  },
  cityId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  duration: {
    type: DataTypes.FLOAT, // en heures ou jours selon ton besoin
    allowNull: false,
  },
  distance: {
    type: DataTypes.FLOAT, // en km
    allowNull: false,
  },
  startPoint: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Point de départ (id dans la table des POIs)',
  },
  endPoint: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Point d\'arrivée (id dans la table des POIs)',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isPremium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
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
  tableName: 'circuits',
  timestamps: true,
  underscored: true,
 
});

Circuit.associate = (models) => {


  // (1.1) Circuit ↔ City
  Circuit.belongsTo(models.City, {
    foreignKey: 'cityId',
    as: 'city',
  });


};




module.exports = { Circuit };
