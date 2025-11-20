// server-go-fez/models/CircuitProgress.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');

const sequelize = db.getSequelize();

const CircuitProgress = sequelize.define(
	"CircuitProgress",
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
			references: {
				model: "users",
				key: "id",
			},
		},
		circuitId: {
			type: DataTypes.UUID,
			allowNull: false,
			// Removed foreign key reference to support both regular and custom circuits
		},
		circuitType: {
			type: DataTypes.ENUM("REGULAR", "CUSTOM"),
			allowNull: false,
			defaultValue: "REGULAR",
		},
		currentPOIIndex: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		completedPOIs: {
			type: DataTypes.JSON, // Stockera un tableau d'IDs de POI
			allowNull: true,
			defaultValue: [],
		},
		status: {
			type: DataTypes.ENUM("STARTED", "IN_PROGRESS", "COMPLETED"),
			defaultValue: "STARTED",
			allowNull: false,
		},
		startedAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
			allowNull: false,
		},
		completedAt: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		totalTime: {
			type: DataTypes.INTEGER, // en minutes
			allowNull: true,
		},
	},
	{
		tableName: "CircuitProgress",
		timestamps: true,
	}
);

module.exports = { CircuitProgress };