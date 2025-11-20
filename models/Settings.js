const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'key',
        comment: 'Unique setting key identifier'
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Setting value (can be JSON string for complex values)'
    },
    type: {
        type: DataTypes.ENUM('boolean', 'string', 'number', 'json'),
        defaultValue: 'string',
        allowNull: false,
        comment: 'Type of the setting value'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description of what this setting does'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['key'],
            name: 'unique_setting_key'
        }
    ]
});

module.exports = { Settings };
