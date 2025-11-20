const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const sequelize = db.getSequelize(); 

const Album = sequelize.define('Album', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    
    // Clé étrangère vers User (l'utilisateur qui a créé l'Album)
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users', 
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
}, {
    tableName: 'albums',
    timestamps: true,
});

module.exports = {Album};