// server-go-fez/models/Subscription.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');
const sequelize = db.getSequelize();

const Subscription = sequelize.define(
	"Subscription",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "Users",
				key: "id",
			},
		},
		plan: {
			type: DataTypes.ENUM("free", "premium", "pro"), // Selon votre plan
			allowNull: false,
			defaultValue: "free",
		},
		status: {
			type: DataTypes.ENUM(
				"active",
				"inactive",
				"canceled",
				"past_due"
			),
			allowNull: false,
			defaultValue: "inactive",
		},
		startDate: {
			type: DataTypes.DATE,
			allowNull: true, // Peut être null si inactif
		},
		endDate: {
			type: DataTypes.DATE,
			allowNull: true, // Peut être null (pourrait être géré par webhook)
		},
		paymentProvider: {
			type: DataTypes.STRING, // Ex: 'cmi', 'sharypay', 'stripe'
			allowNull: true,
		},
		paymentProviderSubscriptionId: {
			type: DataTypes.STRING, // L'ID de l'abonnement chez le fournisseur
			allowNull: true,
			unique: true,
		},
		// 'paymentMethod' a été retiré, car il est généralement géré
		// côté fournisseur de paiement pour des raisons de sécurité (PCI DSS).
		// Nous stockons plutôt l'ID de l'abonnement du fournisseur.
	},
	{
		tableName: "Subscriptions",
		timestamps: true,
		// Un utilisateur ne devrait avoir qu'un seul abonnement actif à la fois (potentiellement)
		// indexes: [
		//   {
		//     unique: true,
		//     fields: ['userId', 'status'],
		//     where: { status: 'active' } // Contrainte partielle (si supportée par DB)
		//   }
		// ]
	}
);

module.exports = { Subscription };