const { DataTypes } = require('sequelize');
const db = require('../Config/db');
const sequelize = db.getSequelize();

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  circuitId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
        model: 'circuits',
        key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  customCircuitId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
        model: 'CustomCircuits',
        key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
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
  // New fields for saved routes (navigation from map)
  poiId: {
    type: DataTypes.UUID,
    allowNull: true,
    // Remove foreign key reference to avoid sync issues
    // Application will handle referential integrity
  },
  poiName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  poiImage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startLocation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Start coordinates: {lat, lng, address}',
    get() {
      const rawValue = this.getDataValue('startLocation');
      if (!rawValue) return null;
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return rawValue;
        }
      }
      return rawValue;
    }
  },
  endLocation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'End coordinates: {lat, lng, address}',
    get() {
      const rawValue = this.getDataValue('endLocation');
      if (!rawValue) return null;
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return rawValue;
        }
      }
      return rawValue;
    }
  },
  distance: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Distance in kilometers',
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Duration in minutes',
  },
  transportMode: {
    type: DataTypes.ENUM('car', 'foot', 'bike', 'motorcycle'),
    allowNull: true,
    defaultValue: 'foot',
  },
  routeGeoJSON: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'GeoJSON LineString of the route',
    get() {
      const rawValue = this.getDataValue('routeGeoJSON');
      if (!rawValue) return null;
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return rawValue;
        }
      }
      return rawValue;
    }
  },
  pointsEarned: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endPoint: {
    type: DataTypes.JSON, 
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW,
  },
}, 
{
  tableName: 'routes',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
});

module.exports = { Route };
