const { Circuit } = require('./Circuit');
const Review = require('./Review');
const { CircuitPOI } = require('./CircuitPOI');
const { CircuitProgress } = require('./CircuitProgress');
const { CustomCircuit } = require('./CustomCircuit');
const { Theme } = require('./Theme');
const { ThemeCircuit } = require('./ThemeCircuit');
const { City } = require('./City');
const { POILocalization } = require('./POILocalization');
const { POIFile } = require('./POIFile');
const { Category } = require('./Category');
const { GamificationRule } = require('./GamificationRule');
const { POI } = require('./POI');
const PointsTransaction = require('./PointsTransaction');
const { User } = require('./User');
const { UserSpace } = require('./UserSpace');
const { FavoritePOI } = require('./FavoritePOI');
const { EmailVerification } = require('./EmailVerification');
const { TransportMode } = require('./TransportMode');
const { Route } = require('./Route');
const { VisitedTrace } = require('./VisitedTrace');
const { RemovedTrace } = require('./RemovedTrace');
const { Album } = require('./Album');
const { AlbumPOI } = require('./AlbumPOI');
const { Share } = require('./Share');
const { IAModel } = require('./IAModel');
const { Settings } = require('./Settings');
const { Badge } = require('./Badge');
const { UserBadge } = require('./UserBadge');
const db = require('../Config/db');

const sequelize = db.getSequelize();

// Création d'un objet contenant tous les modèles
const models = {
  POI,
  Circuit,
  CircuitPOI,
  CircuitProgress,
  CustomCircuit,
  Theme,
  ThemeCircuit,
  City,
  POILocalization,
  POIFile,
  Category,
  GamificationRule,
  Review,
  PointsTransaction,
  User,
  UserSpace,
  FavoritePOI,
  EmailVerification,
  TransportMode,
  Route,
  VisitedTrace,
  RemovedTrace,
  Album,
  AlbumPOI,
  Share,
  IAModel,
  Settings,
  Badge,
  UserBadge,
  sequelize, // Ajouter sequelize pour les transactions
};

// Appel automatique de toutes les associations si elles existent
Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

//  Associations Circuit ↔ POI via CircuitPOI
Circuit.belongsToMany(POI, {
  through: CircuitPOI,
  foreignKey: 'circuitId',
  otherKey: 'poiId',
  as: 'pois',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
POI.belongsToMany(Circuit, {
  through: CircuitPOI,
  foreignKey: 'poiId',
  otherKey: 'circuitId',
  as: 'circuits',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

//  Associations Circuit ↔ Theme via ThemeCircuit
Circuit.belongsToMany(Theme, {
  through: ThemeCircuit,
  foreignKey: 'circuitId',
  otherKey: 'themeId',
  as: 'themes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Theme.belongsToMany(Circuit, {
  through: ThemeCircuit,
  foreignKey: 'themeId',
  otherKey: 'circuitId',
  as: 'circuitsFromThemes',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Category.hasMany(POI, {
  foreignKey: 'category',
  as: 'pois',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

POI.belongsTo(Category, {
  foreignKey: 'category',
  as: 'categoryPOI',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

//  Associations POI ↔ POILocalization
POI.belongsTo(POILocalization, {
  as: 'arLocalization',
  foreignKey: 'ar',
  targetKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
POI.belongsTo(POILocalization, {
  as: 'frLocalization',
  foreignKey: 'fr',
  targetKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
POI.belongsTo(POILocalization, {
  as: 'enLocalization',
  foreignKey: 'en',
  targetKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

POILocalization.hasMany(POI, {
  as: 'arPOIs',
  foreignKey: 'ar',
  sourceKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
POILocalization.hasMany(POI, {
  as: 'frPOIs',
  foreignKey: 'fr',
  sourceKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
POILocalization.hasMany(POI, {
  as: 'enPOIs',
  foreignKey: 'en',
  sourceKey: 'id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

//  Associations POI ↔ POIFile
POI.hasMany(POIFile, {
  as: 'files',
  foreignKey: 'poiId',
  sourceKey: 'id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
POIFile.belongsTo(POI, {
  as: 'poi',
  foreignKey: 'poiId',
  targetKey: 'id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Associations POI ↔ City
POI.belongsTo(City, {
  as: 'city',
  foreignKey: 'cityId',
  targetKey: 'id',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

City.hasMany(POI, {
  as: 'pois',
  foreignKey: 'cityId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

//Associations PointsTransaction ↔ User (1.*)
User.hasMany(PointsTransaction, {
  foreignKey: 'userId',
  as: 'pointsTransactions',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
PointsTransaction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'users',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Associations PointsTransaction ↔ GamificationRule (1.1)
PointsTransaction.belongsTo(GamificationRule, {
  foreignKey: 'gamificationRuleId',
  as: 'rule', // Changed from 'rule' to match service usage
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
GamificationRule.hasMany(PointsTransaction, {
  foreignKey: 'gamificationRuleId',
  as: 'pointsTransactions',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Circuit.hasMany(Review, {
  foreignKey: 'targetId',
  scope: {
    targetType: 'CIRCUIT',
  },
  as: 'reviews',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Review.belongsTo(Circuit, {
  foreignKey: 'targetId',
  constraints: false,
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

POI.hasMany(Review, {
  foreignKey: 'poiId',
  as: 'reviews',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Review.belongsTo(POI, {
  foreignKey: 'poiId',
  as: 'poi',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Review ↔ User associations
Review.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(Review, {
  foreignKey: 'userId',
  as: 'reviews',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

POI.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'ownerInfo',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});

POI.hasOne(UserSpace, {
  foreignKey: 'poi_id',
  as: 'spaceDetails',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
UserSpace.belongsTo(POI, {
  foreignKey: 'poi_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

UserSpace.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'spaceOwner',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(UserSpace, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// (doublons supprimés)

// CircuitProgress Associations
// Note: CircuitProgress supports both regular circuits and custom circuits
// We don't define a belongsTo relationship with Circuit to avoid foreign key constraints
CircuitProgress.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(CircuitProgress, {
  foreignKey: 'userId',
  as: 'circuitProgress',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// CustomCircuit Associations
CustomCircuit.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(CustomCircuit, {
  foreignKey: 'userId',
  as: 'customCircuits',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Share ↔ User associations
Share.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(Share, {
  foreignKey: 'userId',
  as: 'shares',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// (doublons supprimés)
// Associations User ↔ POI via FavoritePOI (sauvegardes)
User.belongsToMany(POI, {
  through: FavoritePOI,
  foreignKey: 'userId',
  otherKey: 'poiId',
  as: 'savedPois',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

POI.belongsToMany(User, {
  through: FavoritePOI,
  foreignKey: 'poiId',
  otherKey: 'userId',
  as: 'savedByUsers',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Associations directes pour FavoritePOI
FavoritePOI.belongsTo(POI, {
  foreignKey: 'poiId',
  as: 'poi',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

FavoritePOI.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Route
Route.belongsTo(Circuit, {
  foreignKey: 'circuitId',
  as: 'circuit',
});
Route.belongsTo(CustomCircuit, {
  foreignKey: 'customCircuitId',
  as: 'customCircuit',
});
Route.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
Route.belongsTo(POI, {
  foreignKey: 'poiId',
  as: 'navigationPOI',
});
Route.hasMany(VisitedTrace, { foreignKey: 'routeId', as: 'visitedTraces' });
Route.hasMany(RemovedTrace, { foreignKey: 'routeId', as: 'removedTraces' });

// VisitedTrace
VisitedTrace.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
VisitedTrace.belongsTo(POI, { foreignKey: 'idPoi', as: 'poi' });

// RemovedTrace
RemovedTrace.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
RemovedTrace.belongsTo(Circuit, { foreignKey: 'circuitId', as: 'circuit' });
RemovedTrace.belongsTo(POI, { foreignKey: 'poiId', as: 'poi' });
RemovedTrace.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Circuit.hasMany(Route, { foreignKey: 'circuitId', as: 'routes' });
CustomCircuit.hasMany(Route, { foreignKey: 'customCircuitId', as: 'routes' });
User.hasMany(Route, { foreignKey: 'userId', as: 'routes' });

// --- Relations Album ---

Album.belongsTo(POIFile, {
  foreignKey: 'poiFileId',
  as: 'coverFile',
});

POIFile.hasOne(Album, {
  foreignKey: 'poiFileId',
  as: 'albumAsCover',
});

// 2. Album (1) --- (*: Many) AlbumPOI
Album.hasMany(AlbumPOI, {
  foreignKey: 'albumId',
  as: 'albumFiles',
});

AlbumPOI.belongsTo(Album, {
  foreignKey: 'albumId',
});

// 3. Album (1) --- (*: Many) User
Album.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(Album, { foreignKey: 'userId', as: 'albumsCreated' });

// --- Relations AlbumPOI ---

// 4. AlbumPOI (*: Many) --- (1) POIFile
AlbumPOI.belongsTo(POIFile, { foreignKey: 'poiFileId', as: 'fileInAlbum' });
POIFile.hasMany(AlbumPOI, {
  foreignKey: 'poiFileId',
  as: 'albumsContainingFile',
});

// Associations Badge ↔ User (Many-to-Many through UserBadge)
User.belongsToMany(Badge, {
  through: UserBadge,
  foreignKey: 'userId',
  otherKey: 'badgeId',
  as: 'badges',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Badge.belongsToMany(User, {
  through: UserBadge,
  foreignKey: 'badgeId',
  otherKey: 'userId',
  as: 'users',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Direct associations for UserBadge
UserBadge.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

UserBadge.belongsTo(Badge, {
  foreignKey: 'badgeId',
  as: 'badge',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

module.exports = models;
