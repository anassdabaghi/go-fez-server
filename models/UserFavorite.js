// server-go-fez/models/UserFavorite.js
const { DataTypes } = require("sequelize");
const db = require('../Config/db');

const sequelize = db.getSequelize();

const UserFavorite = sequelize.define(
	"UserFavorite",
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
		poiId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "POIs",
				key: "id",
			},
		},
	},
	{
		tableName: "UserFavorites",
		timestamps: true,
		indexes: [
			{
				unique: true,
				fields: ["userId", "poiId"],
			},
		],
	}
);

module.exports = { UserFavorite };