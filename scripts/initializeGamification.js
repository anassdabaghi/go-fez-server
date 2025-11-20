// server-go-fez/scripts/initializeGamification.js
const { GamificationRule } = require('../models');

const gamificationRules = [
  // Registration & Profile - High rewards to encourage completion
  {
    activity: 'COMPLETE_REGISTRATION',
    points: 50,
    description: 'Welcome bonus for completing registration',
    descriptionFr: 'Bonus de bienvenue pour avoir complété l\'inscription',
    descriptionAr: 'مكافأة الترحيب لإكمال التسجيل',
    isActive: true
  },
  {
    activity: 'COMPLETE_PROFILE',
    points: 30,
    description: 'Complete your profile with all details',
    descriptionFr: 'Complétez votre profil avec tous les détails',
    descriptionAr: 'أكمل ملفك الشخصي بجميع التفاصيل',
    isActive: true
  },
  {
    activity: 'ADD_PROFILE_PICTURE',
    points: 20,
    description: 'Add a profile picture',
    descriptionFr: 'Ajoutez une photo de profil',
    descriptionAr: 'أضف صورة الملف الشخصي',
    isActive: true
  },

  // Circuit Activities - Main engagement driver
  {
    activity: 'COMPLETE_CIRCUIT',
    points: 100,
    description: 'Complete a circuit',
    descriptionFr: 'Terminez un circuit',
    descriptionAr: 'أكمل دائرة',
    isActive: true
  },
  {
    activity: 'COMPLETE_PREMIUM_CIRCUIT',
    points: 150,
    description: 'Complete a premium circuit',
    descriptionFr: 'Terminez un circuit premium',
    descriptionAr: 'أكمل دائرة مميزة',
    isActive: true
  },
  {
    activity: 'COMPLETE_FIRST_CIRCUIT',
    points: 200,
    description: 'Complete your first circuit - Milestone!',
    descriptionFr: 'Terminez votre premier circuit - Étape importante!',
    descriptionAr: 'أكمل أول دائرة لك - إنجاز مهم!',
    isActive: true
  },
  {
    activity: 'COMPLETE_5_CIRCUITS',
    points: 300,
    description: 'Complete 5 circuits - Explorer!',
    descriptionFr: 'Terminez 5 circuits - Explorateur!',
    descriptionAr: 'أكمل 5 دوائر - مستكشف!',
    isActive: true
  },
  {
    activity: 'COMPLETE_10_CIRCUITS',
    points: 500,
    description: 'Complete 10 circuits - Master Explorer!',
    descriptionFr: 'Terminez 10 circuits - Maître Explorateur!',
    descriptionAr: 'أكمل 10 دوائر - مستكشف خبير!',
    isActive: true
  },
  {
    activity: 'CREATE_CUSTOM_CIRCUIT',
    points: 75,
    description: 'Create your own custom circuit',
    descriptionFr: 'Créez votre propre circuit personnalisé',
    descriptionAr: 'أنشئ دائرتك الخاصة المخصصة',
    isActive: true
  },

  // POI Interactions - Frequent micro-rewards
  {
    activity: 'VISIT_POI',
    points: 10,
    description: 'Visit a point of interest',
    descriptionFr: 'Visitez un point d\'intérêt',
    descriptionAr: 'قم بزيارة نقطة اهتمام',
    isActive: true
  },
  {
    activity: 'VISIT_FIRST_POI',
    points: 50,
    description: 'Visit your first POI!',
    descriptionFr: 'Visitez votre premier POI!',
    descriptionAr: 'قم بزيارة أول نقطة اهتمام!',
    isActive: true
  },
  {
    activity: 'VISIT_5_POIS',
    points: 100,
    description: 'Visit 5 points of interest',
    descriptionFr: 'Visitez 5 points d\'intérêt',
    descriptionAr: 'قم بزيارة 5 نقاط اهتمام',
    isActive: true
  },
  {
    activity: 'VISIT_10_POIS',
    points: 200,
    description: 'Visit 10 points of interest',
    descriptionFr: 'Visitez 10 points d\'intérêt',
    descriptionAr: 'قم بزيارة 10 نقاط اهتمام',
    isActive: true
  },
  {
    activity: 'VISIT_25_POIS',
    points: 400,
    description: 'Visit 25 points of interest - Adventurer!',
    descriptionFr: 'Visitez 25 points d\'intérêt - Aventurier!',
    descriptionAr: 'قم بزيارة 25 نقطة اهتمام - مغامر!',
    isActive: true
  },
  {
    activity: 'VISIT_50_POIS',
    points: 750,
    description: 'Visit 50 points of interest - Legend!',
    descriptionFr: 'Visitez 50 points d\'intérêt - Légende!',
    descriptionAr: 'قم بزيارة 50 نقطة اهتمام - أسطورة!',
    isActive: true
  },
  {
    activity: 'SAVE_POI',
    points: 5,
    description: 'Save a POI to your favorites',
    descriptionFr: 'Enregistrez un POI dans vos favoris',
    descriptionAr: 'احفظ نقطة اهتمام في مفضلاتك',
    isActive: true
  },
  {
    activity: 'CHECK_IN_POI',
    points: 15,
    description: 'Check in at a POI',
    descriptionFr: 'Enregistrez votre présence dans un POI',
    descriptionAr: 'سجل حضورك في نقطة اهتمام',
    isActive: true
  },

  // Social Activities - Encourage sharing and reviews
  {
    activity: 'SHARE_WITH_FRIEND',
    points: 25,
    description: 'Share a circuit or POI with a friend',
    descriptionFr: 'Partagez un circuit ou POI avec un ami',
    descriptionAr: 'شارك دائرة أو نقطة اهتمام مع صديق',
    isActive: true
  },
  {
    activity: 'LEAVE_REVIEW',
    points: 20,
    description: 'Leave a review',
    descriptionFr: 'Laissez un avis',
    descriptionAr: 'اترك تقييمًا',
    isActive: true
  },
  {
    activity: 'FIRST_REVIEW',
    points: 50,
    description: 'Leave your first review!',
    descriptionFr: 'Laissez votre premier avis!',
    descriptionAr: 'اترك أول تقييم لك!',
    isActive: true
  },
  {
    activity: 'LEAVE_5_REVIEWS',
    points: 150,
    description: 'Leave 5 reviews - Helpful Contributor!',
    descriptionFr: 'Laissez 5 avis - Contributeur Utile!',
    descriptionAr: 'اترك 5 تقييمات - مساهم مفيد!',
    isActive: true
  },
  {
    activity: 'HELPFUL_REVIEW',
    points: 10,
    description: 'Someone found your review helpful',
    descriptionFr: 'Quelqu\'un a trouvé votre avis utile',
    descriptionAr: 'وجد شخص ما تقييمك مفيدًا',
    isActive: true
  },

  // Daily/Streak Activities - Build habit
  {
    activity: 'DAILY_LOGIN',
    points: 15,
    description: 'Daily login bonus',
    descriptionFr: 'Bonus de connexion quotidienne',
    descriptionAr: 'مكافأة تسجيل الدخول اليومي',
    isActive: true
  },
  {
    activity: 'WEEKLY_STREAK',
    points: 150,
    description: '7-day login streak!',
    descriptionFr: 'Série de 7 jours de connexion!',
    descriptionAr: 'سلسلة تسجيل دخول لمدة 7 أيام!',
    isActive: true
  },
  {
    activity: 'MONTHLY_STREAK',
    points: 500,
    description: '30-day login streak - Dedicated!',
    descriptionFr: 'Série de 30 jours de connexion - Dévoué!',
    descriptionAr: 'سلسلة تسجيل دخول لمدة 30 يومًا - مخلص!',
    isActive: true
  },

  // Discovery & Exploration - Time-based bonuses
  {
    activity: 'DISCOVER_NEW_CITY',
    points: 100,
    description: 'Visit a new city',
    descriptionFr: 'Visitez une nouvelle ville',
    descriptionAr: 'قم بزيارة مدينة جديدة',
    isActive: true
  },
  {
    activity: 'VISIT_ALL_CATEGORIES',
    points: 300,
    description: 'Visit POIs from all categories',
    descriptionFr: 'Visitez des POI de toutes les catégories',
    descriptionAr: 'قم بزيارة نقاط اهتمام من جميع الفئات',
    isActive: true
  },
  {
    activity: 'NIGHT_EXPLORER',
    points: 30,
    description: 'Visit a POI at night (after 8pm)',
    descriptionFr: 'Visitez un POI la nuit (après 20h)',
    descriptionAr: 'قم بزيارة نقطة اهتمام ليلاً (بعد الساعة 8 مساءً)',
    isActive: true
  },
  {
    activity: 'EARLY_BIRD',
    points: 25,
    description: 'Visit a POI early morning (5am-8am)',
    descriptionFr: 'Visitez un POI tôt le matin (5h-8h)',
    descriptionAr: 'قم بزيارة نقطة اهتمام في الصباح الباكر (5 صباحًا - 8 صباحًا)',
    isActive: true
  },
  {
    activity: 'WEEKEND_WARRIOR',
    points: 20,
    description: 'Visit a POI on the weekend',
    descriptionFr: 'Visitez un POI le week-end',
    descriptionAr: 'قم بزيارة نقطة اهتمام في عطلة نهاية الأسبوع',
    isActive: true
  },

  // Partner Activities
  {
    activity: 'VISIT_PARTNER',
    points: 40,
    description: 'Visit a partner location',
    descriptionFr: 'Visitez un lieu partenaire',
    descriptionAr: 'قم بزيارة موقع شريك',
    isActive: true
  },
  {
    activity: 'SCAN_QR_CODE',
    points: 20,
    description: 'Scan a QR code at a location',
    descriptionFr: 'Scannez un code QR à un emplacement',
    descriptionAr: 'امسح رمز الاستجابة السريعة في موقع',
    isActive: true
  },

  // Achievements - Special bonuses
  {
    activity: 'PHOTOGRAPHY_LOVER',
    points: 35,
    description: 'Upload a photo at a POI',
    descriptionFr: 'Téléchargez une photo à un POI',
    descriptionAr: 'قم بتحميل صورة في نقطة اهتمام',
    isActive: true
  },
  {
    activity: 'SOCIAL_BUTTERFLY',
    points: 100,
    description: 'Share 10 times with friends',
    descriptionFr: 'Partagez 10 fois avec des amis',
    descriptionAr: 'شارك 10 مرات مع الأصدقاء',
    isActive: true
  },
  {
    activity: 'LOCAL_GUIDE',
    points: 50,
    description: 'Write a detailed review (100+ characters)',
    descriptionFr: 'Rédigez un avis détaillé (100+ caractères)',
    descriptionAr: 'اكتب مراجعة مفصلة (100+ حرف)',
    isActive: true
  },
];

async function initializeGamificationRules() {
  try {
    console.log('🎮 Initializing gamification rules...');

    for (const rule of gamificationRules) {
      const [gamificationRule, created] = await GamificationRule.findOrCreate({
        where: { activity: rule.activity },
        defaults: rule
      });

      if (created) {
        console.log(`✅ Created rule: ${rule.activity} (${rule.points} points)`);
      } else {
        console.log(`⏭️  Rule already exists: ${rule.activity}`);
      }
    }

    console.log('✅ Gamification rules initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing gamification rules:', error);
  }
}

module.exports = { initializeGamificationRules };
