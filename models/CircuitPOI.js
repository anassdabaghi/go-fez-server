const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const CircuitPOI = sequelize.define('CircuitPOI', {
    poiId: {        
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    circuitId: {    
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    order: {        
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    estimatedTime: { // temps estimé en minutes
        type: DataTypes.INTEGER,
        allowNull: true,
    }
}, {
    tableName: 'circuit_poi', 
    timestamps: false,
});

module.exports = { CircuitPOI };
