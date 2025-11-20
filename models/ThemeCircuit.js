const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const ThemeCircuit = sequelize.define('ThemeCircuit', {
  
    themeId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    circuitId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    }
  }, {
    tableName: 'theme_circuit',
    timestamps: false,
  });


module.exports = { ThemeCircuit };
