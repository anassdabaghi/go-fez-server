// server-go-fez/models/UserBadge.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');

const sequelize = db.getSequelize();

const UserBadge = sequelize.define(
	"UserBadge",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		userId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "users",
				key: "id",
			},
		},
		badgeId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "Badges",
				key: "id",
			},
		},
		earnedAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		tableName: "UserBadges",
		timestamps: false,
		// Assure qu'un utilisateur ne peut pas avoir le même badge plusieurs fois
		indexes: [
			{
				unique: true,
				fields: ["userId", "badgeId"],
			},
		],
	}
);

module.exports = { UserBadge };