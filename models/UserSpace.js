const { DataTypes } = require('sequelize');
const db = require('../Config/db'); 
const sequelize = db.getSequelize();

const UserSpace = sequelize.define('UserSpace', {

    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
    },
    
    poiId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'poi_id'
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
    tableName: 'user_spaces', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    // indexes: [
    //     {
    //         unique: true,
    //         fields: ['user_id', 'poi_id'],
    //         name: 'unique_user_poi_space'
    //     }
    // ]
});

module.exports = { UserSpace };