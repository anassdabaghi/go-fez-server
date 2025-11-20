// server-go-fez/models/Share.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');
const sequelize = db.getSequelize();

const Share = sequelize.define(
	"Share",
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
		resourceType: {
			type: DataTypes.ENUM("circuit", "poi"),
			allowNull: false,
		},
		resourceId: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		platform: {
			type: DataTypes.ENUM("facebook", "twitter", "whatsapp", "link"),
			allowNull: false,
		},
	},
	{
		tableName: "shares",
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
	}
);

module.exports = { Share };