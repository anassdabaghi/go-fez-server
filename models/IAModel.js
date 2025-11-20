const { DataTypes } = require('sequelize');
const db = require('../Config/db');

const sequelize = db.getSequelize();

const IAModel = sequelize.define('IAModel', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    provider: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'AI provider name (e.g., gemini, grok, openai)'
    },
    models_list: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'List of available models for this provider'
    },
    selected_model: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Currently selected model for this provider'
    },
    api_key: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'API key for this provider (encrypted recommended)'
    },
    api_endpoint: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'API endpoint URL'
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Custom prompt template for translations'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is the default provider'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this provider is currently active'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'IAModels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = { IAModel };
