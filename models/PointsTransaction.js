const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const PointsTransaction = sequelize.define(
  'PointsTransaction',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      comment: "Clé étrangère vers l'utilisateur (User)",
    },
    isClaimed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Indique si les points ont été réclamés par l'utilisateur",
    },
    gamificationRuleId: {
      type: DataTypes.UUID,
      allowNull: true, // Peut être null si la transaction n'est pas liée à une règle spécifique (ex: correction manuelle)
      field: 'gamification_rule_id',
      comment: 'Clé étrangère vers la règle de gamification (GamificationRule)',
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Nombre de points gagnés (positif) ou perdus (négatif)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'points_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // indexes: [
    //     {
    //         fields: ['user_id'],
    //         name: 'idx_points_transaction_user'
    //     },
    //     {
    //         fields: ['gamification_rule_id'],
    //         name: 'idx_points_transaction_rule'
    //     }
    // ]
  }
);

module.exports = PointsTransaction;
