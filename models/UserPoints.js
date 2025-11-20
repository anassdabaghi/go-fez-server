// server-go-fez/models/UserPoints.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');

const sequelize = db.getSequelize();

const UserPoints = sequelize.define(
	"UserPoints",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
			allowNull: false,
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: false,
			unique: true, // Un seul enregistrement de points par utilisateur
			references: {
				model: "Users",
				key: "id",
			},
		},
		totalPoints: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		level: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 1,
		},
	},
	{
		tableName: "UserPoints",
		timestamps: true,
	}
);

module.exports = { UserPoints };