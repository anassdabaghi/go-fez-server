const GAMIFICATIONS_ENUM = [
  // Registration & Profile
  'COMPLETE_REGISTRATION',
  'COMPLETE_PROFILE',
  'ADD_PROFILE_PICTURE',

  // Circuit Activities
  'COMPLETE_CIRCUIT',
  'COMPLETE_PREMIUM_CIRCUIT',
  'COMPLETE_FIRST_CIRCUIT',
  'COMPLETE_5_CIRCUITS',
  'COMPLETE_10_CIRCUITS',
  'CREATE_CUSTOM_CIRCUIT',

  // POI Interactions
  'VISIT_POI',
  'VISIT_FIRST_POI',
  'VISIT_5_POIS',
  'VISIT_10_POIS',
  'VISIT_25_POIS',
  'VISIT_50_POIS',
  'SAVE_POI',
  'CHECK_IN_POI',

  // Social Activities
  'SHARE_WITH_FRIEND',
  'LEAVE_REVIEW',
  'FIRST_REVIEW',
  'LEAVE_5_REVIEWS',
  'HELPFUL_REVIEW', // When someone marks review as helpful

  // Daily/Streak Activities
  'DAILY_LOGIN',
  'WEEKLY_STREAK',
  'MONTHLY_STREAK',

  // Discovery & Exploration
  'DISCOVER_NEW_CITY',
  'VISIT_ALL_CATEGORIES',
  'NIGHT_EXPLORER', // Visit POI after 8pm
  'EARLY_BIRD', // Visit POI before 8am
  'WEEKEND_WARRIOR', // Visit POIs on weekend

  // Partner Activities
  'VISIT_PARTNER',
  'SCAN_QR_CODE',

  // Achievements
  'PHOTOGRAPHY_LOVER', // Upload photos at POIs
  'SOCIAL_BUTTERFLY', // Share multiple times
  'LOCAL_GUIDE', // Leave detailed reviews
];

module.exports = { GAMIFICATIONS_ENUM };
