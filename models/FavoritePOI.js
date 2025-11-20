const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const FavoritePOI = sequelize.define('FavoritePOI', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'pois',
      key: 'id'
    },
    field: 'poi_id'
  },
  savedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'saved_at'
  }
}, {
  tableName: 'favorite_poi',
  timestamps: true,
  updatedAt: false,
  createdAt: 'saved_at'
});

module.exports = { FavoritePOI };

