// server-go-fez/models/Partner.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');
const sequelize = db.getSequelize();

const Partner = sequelize.define(
	"Partner",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		// Ajout de localisations
		nameAr: { type: DataTypes.STRING },
		nameEn: { type: DataTypes.STRING },
		description: { type: DataTypes.TEXT },
		descriptionAr: { type: DataTypes.TEXT },
		descriptionEn: { type: DataTypes.TEXT },
		category: {
			// Ex: 'Restaurant', 'Boutique', 'Artisanat', 'Hôtel'
			type: DataTypes.STRING,
			allowNull: false,
		},
		address: { type: DataTypes.STRING },
		coordinates: {
			// Pour l'affichage sur la carte
			type: DataTypes.GEOMETRY("POINT"),
			allowNull: true,
		},
		logo: {
			// URL Cloudinary
			type: DataTypes.STRING,
			allowNull: true,
		},
		discount: {
			// Pourcentage ou description de la réduction
			type: DataTypes.STRING,
			allowNull: true,
		},
		qrCode: {
			// Identifiant unique lié au partenaire pour le scan
			type: DataTypes.STRING,
			allowNull: true,
			unique: true,
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
			allowNull: false,
		},
		isDeleted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		// Ajout possible: cityId, heures d'ouverture, etc.
	},
	{
		tableName: "Partners",
		timestamps: true,
	}
);

module.exports = { Partner };