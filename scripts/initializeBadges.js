// server-go-fez/scripts/initializeBadges.js
const { Badge } = require('../models');

const defaultBadges = [
  // Explorer Badges - POI and Circuit Exploration
  {
    nameEn: 'First Steps',
    nameFr: 'Premiers Pas',
    nameAr: 'الخطوات الأولى',
    descriptionEn: 'Visit your first point of interest',
    descriptionFr: 'Visitez votre premier point d\'intérêt',
    descriptionAr: 'قم بزيارة أول نقطة اهتمام',
    icon: '🚶',
    category: 'explorer',
    requiredActivity: 'VISIT_FIRST_POI',
  },
  {
    nameEn: 'Explorer',
    nameFr: 'Explorateur',
    nameAr: 'المستكشف',
    descriptionEn: 'Visit 10 points of interest',
    descriptionFr: 'Visitez 10 points d\'intérêt',
    descriptionAr: 'قم بزيارة 10 نقاط اهتمام',
    icon: '🗺️',
    category: 'explorer',
    requiredActivity: 'VISIT_10_POIS',
  },
  {
    nameEn: 'Adventurer',
    nameFr: 'Aventurier',
    nameAr: 'المغامر',
    descriptionEn: 'Visit 25 points of interest',
    descriptionFr: 'Visitez 25 points d\'intérêt',
    descriptionAr: 'قم بزيارة 25 نقطة اهتمام',
    icon: '🧭',
    category: 'explorer',
    requiredActivity: 'VISIT_25_POIS',
  },
  {
    nameEn: 'Legend',
    nameFr: 'Légende',
    nameAr: 'الأسطورة',
    descriptionEn: 'Visit 50 points of interest',
    descriptionFr: 'Visitez 50 points d\'intérêt',
    descriptionAr: 'قم بزيارة 50 نقطة اهتمام',
    icon: '👑',
    category: 'explorer',
    requiredActivity: 'VISIT_50_POIS',
  },
  {
    nameEn: 'Circuit Master',
    nameFr: 'Maître des Circuits',
    nameAr: 'سيد الدوائر',
    descriptionEn: 'Complete 10 circuits',
    descriptionFr: 'Terminez 10 circuits',
    descriptionAr: 'أكمل 10 دوائر',
    icon: '🎯',
    category: 'explorer',
    requiredActivity: 'COMPLETE_10_CIRCUITS',
  },

  // Social Badges - Reviews and Sharing
  {
    nameEn: 'Reviewer',
    nameFr: 'Évaluateur',
    nameAr: 'المقيّم',
    descriptionEn: 'Leave your first review',
    descriptionFr: 'Laissez votre premier avis',
    descriptionAr: 'اترك أول تقييم',
    icon: '⭐',
    category: 'social',
    requiredActivity: 'FIRST_REVIEW',
  },
  {
    nameEn: 'Local Guide',
    nameFr: 'Guide Local',
    nameAr: 'الدليل المحلي',
    descriptionEn: 'Write detailed reviews to help others',
    descriptionFr: 'Rédigez des avis détaillés pour aider les autres',
    descriptionAr: 'اكتب مراجعات مفصلة لمساعدة الآخرين',
    icon: '📝',
    category: 'social',
    requiredActivity: 'LOCAL_GUIDE',
  },
  {
    nameEn: 'Helpful Contributor',
    nameFr: 'Contributeur Utile',
    nameAr: 'المساهم المفيد',
    descriptionEn: 'Leave 5 reviews',
    descriptionFr: 'Laissez 5 avis',
    descriptionAr: 'اترك 5 تقييمات',
    icon: '🌟',
    category: 'social',
    requiredActivity: 'LEAVE_5_REVIEWS',
  },
  {
    nameEn: 'Social Butterfly',
    nameFr: 'Papillon Social',
    nameAr: 'الفراشة الاجتماعية',
    descriptionEn: 'Share 10 times with friends',
    descriptionFr: 'Partagez 10 fois avec des amis',
    descriptionAr: 'شارك 10 مرات مع الأصدقاء',
    icon: '🦋',
    category: 'social',
    requiredActivity: 'SOCIAL_BUTTERFLY',
  },
  {
    nameEn: 'Photographer',
    nameFr: 'Photographe',
    nameAr: 'المصور',
    descriptionEn: 'Upload photos at POIs',
    descriptionFr: 'Téléchargez des photos aux POIs',
    descriptionAr: 'قم بتحميل الصور في نقاط الاهتمام',
    icon: '📸',
    category: 'social',
    requiredActivity: 'PHOTOGRAPHY_LOVER',
  },

  // Premium Badges - Special Activities
  {
    nameEn: 'Night Owl',
    nameFr: 'Oiseau de Nuit',
    nameAr: 'بومة الليل',
    descriptionEn: 'Visit POIs at night',
    descriptionFr: 'Visitez des POIs la nuit',
    descriptionAr: 'قم بزيارة نقاط الاهتمام ليلاً',
    icon: '🦉',
    category: 'premium',
    requiredActivity: 'NIGHT_EXPLORER',
  },
  {
    nameEn: 'Early Bird',
    nameFr: 'Lève-tôt',
    nameAr: 'المبكر',
    descriptionEn: 'Visit POIs in early morning',
    descriptionFr: 'Visitez des POIs tôt le matin',
    descriptionAr: 'قم بزيارة نقاط الاهتمام في الصباح الباكر',
    icon: '🐦',
    category: 'premium',
    requiredActivity: 'EARLY_BIRD',
  },
  {
    nameEn: 'Weekend Warrior',
    nameFr: 'Guerrier du Week-end',
    nameAr: 'محارب عطلة نهاية الأسبوع',
    descriptionEn: 'Visit POIs on weekends',
    descriptionFr: 'Visitez des POIs le week-end',
    descriptionAr: 'قم بزيارة نقاط الاهتمام في عطلة نهاية الأسبوع',
    icon: '⚔️',
    category: 'premium',
    requiredActivity: 'WEEKEND_WARRIOR',
  },

  // Event/Streak Badges - Consistency and Dedication
  {
    nameEn: 'Dedicated',
    nameFr: 'Dévoué',
    nameAr: 'المخلص',
    descriptionEn: 'Login for 7 consecutive days',
    descriptionFr: 'Connectez-vous pendant 7 jours consécutifs',
    descriptionAr: 'سجل الدخول لمدة 7 أيام متتالية',
    icon: '🔥',
    category: 'event',
    requiredActivity: 'WEEKLY_STREAK',
  },
  {
    nameEn: 'Super Dedicated',
    nameFr: 'Super Dévoué',
    nameAr: 'المخلص الخارق',
    descriptionEn: 'Login for 30 consecutive days',
    descriptionFr: 'Connectez-vous pendant 30 jours consécutifs',
    descriptionAr: 'سجل الدخول لمدة 30 يومًا متتاليًا',
    icon: '💎',
    category: 'event',
    requiredActivity: 'MONTHLY_STREAK',
  },

  // Point-based Badges
  {
    nameEn: 'Rookie',
    nameFr: 'Débutant',
    nameAr: 'المبتدئ',
    descriptionEn: 'Reach 100 points',
    descriptionFr: 'Atteignez 100 points',
    descriptionAr: 'اوصل إلى 100 نقطة',
    icon: '🥉',
    category: 'explorer',
    requiredPoints: 100,
  },
  {
    nameEn: 'Intermediate',
    nameFr: 'Intermédiaire',
    nameAr: 'المتوسط',
    descriptionEn: 'Reach 500 points',
    descriptionFr: 'Atteignez 500 points',
    descriptionAr: 'اوصل إلى 500 نقطة',
    icon: '🥈',
    category: 'explorer',
    requiredPoints: 500,
  },
  {
    nameEn: 'Expert',
    nameFr: 'Expert',
    nameAr: 'الخبير',
    descriptionEn: 'Reach 1000 points',
    descriptionFr: 'Atteignez 1000 points',
    descriptionAr: 'اوصل إلى 1000 نقطة',
    icon: '🥇',
    category: 'explorer',
    requiredPoints: 1000,
  },
  {
    nameEn: 'Master',
    nameFr: 'Maître',
    nameAr: 'السيد',
    descriptionEn: 'Reach 2500 points',
    descriptionFr: 'Atteignez 2500 points',
    descriptionAr: 'اوصل إلى 2500 نقطة',
    icon: '🏆',
    category: 'explorer',
    requiredPoints: 2500,
  },
  {
    nameEn: 'Champion',
    nameFr: 'Champion',
    nameAr: 'البطل',
    descriptionEn: 'Reach 5000 points',
    descriptionFr: 'Atteignez 5000 points',
    descriptionAr: 'اوصل إلى 5000 نقطة',
    icon: '⭐',
    category: 'explorer',
    requiredPoints: 5000,
  },
];

async function initializeBadges() {
  try {
    console.log('🏆 Initializing badges...');

    for (const badgeData of defaultBadges) {
      // Check if badge already exists by name
      const [badge, created] = await Badge.findOrCreate({
        where: { nameEn: badgeData.nameEn },
        defaults: badgeData
      });

      if (created) {
        console.log(`✅ Created badge: ${badgeData.nameEn}`);
      } else {
        console.log(`⏭️  Badge already exists: ${badgeData.nameEn}`);
      }
    }

    console.log('✅ Badges initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing badges:', error);
  }
}

module.exports = { initializeBadges };
