const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./Config/logger');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./Config/db.js'); // Importer l'instance Singleton de la base de données
const models = require('./models/index.js');
const {
  initializeDefaultSettings,
} = require('./controllers/SettingsController.js');
const {
  initializeGamificationRules,
} = require('./scripts/initializeGamification.js');
const { initializeBadges } = require('./scripts/initializeBadges.js');
const CustomCircuitRouter = require('./routes/CustomCircuitRoutes.js'); // Importer les routes utilisateur
const { UserRouter } = require('./routes/UserRoute.js'); // Importer les routes utilisateur
const CityRoute = require('./routes/CityRoute.js');
const ThemeRoute = require('./routes/ThemeRoute.js');
const CircuitRoutes = require('./routes/CircuitRoutes.js');
const categoryRoutes = require('./routes/categoryRoutes.js');
const { POIRouter } = require('./routes/POIRoute.js'); // Importer les routes POI
const { ConfigRouter } = require('./routes/ConfigRoute.js');
const { GamificationRouter } = require('./routes/gamificationRouter.js');
const pointsTransactionRoutes = require('./routes/pointsTransactionRoutes.js');
const routeRoutes = require('./routes/routeRoutes.js');
const savePOIRoutes = require('./routes/SavePOIRoutes.js');
const circuitProgressRoutes = require('./routes/CircuitProgressRoutes');
const ReviewRouter = require('./routes/ReviewRoutes.js');
const ShareRouter = require('./routes/ShareRoutes.js');
const IAModelRoutes = require('./routes/IAModelRoutes.js');
const { SettingsRouter } = require('./routes/SettingsRoutes.js');
const StatisticsRoutes = require('./routes/StatisticsRoutes.js');

const app = express();
const { header } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  seedDefaultGamifications,
} = require('./controllers/gamificationController.js');

// Charger les variables sensibles depuis le fichier .env
const PORT = process.env.PORT || 8080;
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://go-fez.vercel.app',
  'http://localhost:8081', // React Native Web/Expo
  'http://localhost:19006', // Expo Web
  'http://10.0.2.2:8081', // Android Emulator
  'http://10.56.42.19:8081', // Physical device on same network
  'http://10.56.42.19:19000', // Expo on physical device
  'http://10.56.42.19:19006', // Expo Web on physical device
  'null',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Allow all localhost and local network origins in development
      if (process.env.NODE_ENV !== 'production') {
        // Allow localhost with any port
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
          return;
        }

        // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const localIpPattern =
          /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/;
        if (localIpPattern.test(origin)) {
          console.log('✅ Local network origin allowed:', origin);
          callback(null, true);
          return;
        }
      }

      // Check allowed origins list
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.log('❌ CORS blocked origin:', origin);
        // In production, reject unauthorized origins; in development, allow all
        if (process.env.NODE_ENV === 'production') {
          callback(new Error('Not allowed by CORS'), false);
        } else {
          callback(null, true); // Allow all in development
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'x-method',
      'Accept',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-CSRF-Token'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Configuration Helmet pour permettre les requêtes depuis les apps mobiles
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
); // Ajouter des en-têtes de sécurité

// Middleware pour parser les cookies
app.use(cookieParser());
app.use(morgan('combined', { stream: logger.stream }));

// Limiter les requêtes à 100 par heure par IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // max 1000 requêtes par minute
  message: 'Trop de requêtes, réessayez dans une minute.',
});

app.use(limiter);

const jsonMiddleware = express.json({ limit: '50mb' });
app.use(express.urlencoded({ extended: true, limit: '50mb' })); 

// Routes avec files (multer)
app.use('/api/themes/', ThemeRoute);
app.use('/api/circuits', jsonMiddleware, CircuitRoutes);
app.use('/api/city', CityRoute);
app.use('/api/pois', jsonMiddleware, POIRouter);
app.use('/api/routes', jsonMiddleware, routeRoutes);
app.use('/progress', jsonMiddleware, circuitProgressRoutes);
app.use('/api/routes', jsonMiddleware, routeRoutes);
// Routes sans files
app.use('/api/auth', jsonMiddleware, UserRouter);
app.use('/api/users', jsonMiddleware, UserRouter); // Add users route for profile endpoints
app.use('/api/categorys', jsonMiddleware, categoryRoutes);
app.use('/api/config', jsonMiddleware, ConfigRouter);
app.use('/api/gamification', jsonMiddleware, GamificationRouter);
app.use('/api/pointsTransaction', jsonMiddleware, pointsTransactionRoutes);
app.use('/api/save-poi', jsonMiddleware, savePOIRoutes);
app.use('/api/custom-circuits', jsonMiddleware, CustomCircuitRouter);
app.use('/api/reviews', jsonMiddleware, ReviewRouter);
app.use('/api/shares', jsonMiddleware, ShareRouter);
app.use('/api/ia-models', jsonMiddleware, IAModelRoutes);
app.use('/api/settings', jsonMiddleware, SettingsRouter);
app.use('/api/stats', jsonMiddleware, StatisticsRoutes);
app.use('/api/routes', jsonMiddleware, routeRoutes);
// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.message);

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Erreur serveur',
  });
});

// Fonction pour démarrer le serveur
function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server is running on interface 0.0.0.0 and port ${PORT}`);
  });
}

db.initializeDatabase()
  .then(async () => {
    // Démarrer le serveur
    startServer();
    console.log('✅ Application GO-FEZ initialisée avec succès');
    seedDefaultGamifications();
  })
  .catch((error) => {
    logger.error(`Erreur lors de l'initialisation de l'application :
			${error}`);
    process.exit(1); // Arrêter l'application en cas d'échec critique
  });

//  db.dropAllIndexes()

//  db.dropFacebookIdIndex()
//  db.dropGoogleIdIndex()
//  db.dropPhoneIndex()
//  db.dropPrimaryIdentifierIndex()
