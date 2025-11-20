// server-go-fez/models/PartnerVisit.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');
const sequelize = db.getSequelize();

const PartnerVisit = sequelize.define(
	"PartnerVisit",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		partnerId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "Partners", // Nom de la table des partenaires
				key: "id",
			},
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "Users",
				key: "id",
			},
		},
		visitedAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
			allowNull: false,
		},
		rewardClaimed: {
			// Si la visite a donné lieu à une récompense (points, badge)
			type: DataTypes.BOOLEAN,
			defaultValue: false,
			allowNull: false,
		},
		// Ajout possible: notes, montant dépensé, etc.
	},
	{
		tableName: "PartnerVisits",
		timestamps: true, // `createdAt` équivaut à `visitedAt` ici
		updatedAt: false, // Probablement pas nécessaire
	}
);

module.exports = { PartnerVisit };