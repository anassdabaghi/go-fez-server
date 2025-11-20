const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const sequelize = db.getSequelize();

const RemovedTrace = sequelize.define('RemovedTrace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  routeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'routes',   
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
            
    },
  poiId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pois',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
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

}, 
{
  tableName: 'removed_traces',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
});

module.exports = { RemovedTrace };

