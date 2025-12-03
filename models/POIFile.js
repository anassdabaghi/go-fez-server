const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const sequelize = db.getSequelize();

const POIFile = sequelize.define('POIFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'poi_id',
  },
  fileUrl: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    field: 'file_url',
    validate: { isUrl: true },
    comment: 'URL du fichier sur Cloudinary'
  },
  filePublicId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'file_public_id',
  },
  type: {
    type: DataTypes.ENUM('image', 'video', 'virtualtour', 'imageAlbum', 'youtubeVideo'),
    allowNull: false,
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
  tableName: 'poi_files',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['poi_id'], name: 'idx_poi_file_poi' },
    { fields: ['type'], name: 'idx_poi_file_type' },
    { fields: ['file_public_id'], name: 'idx_poi_file_public_id' }
  ]
});

module.exports = { POIFile };