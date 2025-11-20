// server-go-fez/models/CustomCircuit.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');
const sequelize = db.getSequelize();

const CustomCircuit = sequelize.define(
	"CustomCircuit",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		userId: {
			type: DataTypes.INTEGER, // Changed from UUID to INTEGER to match User.id
			allowNull: false,
			// Remove direct references - let associations handle foreign keys
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		selectedPOIs: {
			type: DataTypes.JSON, // Stockera un tableau d'IDs de POI ordonné
			allowNull: false,
		},
		startDate: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		estimatedDuration: {
			type: DataTypes.INTEGER, // en minutes
			allowNull: true,
		},
		isPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
			allowNull: false,
		},
		isDeleted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	},
	{
		tableName: "CustomCircuits",
		timestamps: true,
	}
);

module.exports = { CustomCircuit };