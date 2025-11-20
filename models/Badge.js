// server-go-fez/models/Badge.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');

const sequelize = db.getSequelize();

const Badge = sequelize.define(
	"Badge",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
			allowNull: false,
		},
		nameAr: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		nameFr: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		nameEn: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		descriptionAr: {
			type: DataTypes.STRING,
		},
		descriptionFr: {
			type: DataTypes.STRING,
		},
		descriptionEn: {
			type: DataTypes.STRING,
		},
		icon: {
			type: DataTypes.STRING, // URL vers l'icône (Cloudinary)
			allowNull: false,
		},
		category: {
			type: DataTypes.ENUM("explorer", "social", "premium", "event"),
			allowNull: false,
			defaultValue: "explorer",
		},
		requiredPoints: {
			type: DataTypes.INTEGER,
			allowNull: true, // Peut être débloqué par des points
		},
		requiredActivity: {
			type: DataTypes.STRING,
			allowNull: true, // Ou par une activité spécifique
		},
	},
	{
		tableName: "Badges",
		timestamps: true,
	}
);

module.exports = { Badge };