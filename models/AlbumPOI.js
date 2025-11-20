const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const sequelize = db.getSequelize();

const AlbumPOI = sequelize.define('AlbumPOI', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    // Clé étrangère vers Album
    albumId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'albums', 
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },

    poiFileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'poi_files',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
}, {
    tableName: 'album_pois',
    timestamps: true,
});

module.exports = {AlbumPOI};