const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const { GAMIFICATIONS_ENUM } = require('../constants/gamifications');
const sequelize = db.getSequelize();

const GamificationRule = sequelize.define(
  'GamificationRule',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    activity: {
      type: DataTypes.ENUM(...GAMIFICATIONS_ENUM),
      allowNull: false,
    },

    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descriptionAr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descriptionFr: {
      type: DataTypes.STRING,
      allowNull: false,
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
    tableName: 'gamification_rules',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
  }
);

module.exports = { GamificationRule };
