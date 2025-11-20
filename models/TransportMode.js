const { DataTypes } = require('sequelize');
const db = require('../Config/db'); 

const sequelize = db.getSequelize();

const TransportMode = sequelize.define('TransportMode', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    // Le nom unique du mode (utilisé dans les paramètres d'API)
    modeKey: {
        type: DataTypes.ENUM('walk', 'bike', 'motor', 'car'),
        allowNull: false,
        unique: true,
        field: 'mode_key',
        comment: 'Clé utilisée dans les requêtes (ex: walk, car)'
    },
    // Vitesse moyenne en kilomètres par heure (km/h)
    averageSpeedKmH: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: 'average_speed_km_h',
        comment: 'Vitesse moyenne en km/h'
    },
    
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at', defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at', defaultValue: DataTypes.NOW }
}, {
    tableName: 'transport_modes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = { TransportMode };