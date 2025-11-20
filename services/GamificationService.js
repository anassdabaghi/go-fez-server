// server-go-fez/services/GamificationService.js
const { GamificationRule, Badge, UserBadge } = require('../models');
const PointsTransaction = require('../models/PointsTransaction');
const { User } = require('../models/User');

/**
 * Award points to a user for a specific activity
 * @param {number} userId - User ID
 * @param {string} activity - Activity type (e.g., 'COMPLETE_CIRCUIT')
 * @param {object} metadata - Optional metadata about the activity
 * @param {object} transaction - Sequelize transaction (optional)
 * @returns {object} Points awarded info
 */
async function awardPoints(userId, activity, metadata = {}, transaction = null) {
  try {
    // Get the rule for this activity
    const rule = await GamificationRule.findOne({
      where: { activity, isActive: true },
      transaction
    });

    if (!rule) {
      console.warn(`⚠️ No active rule found for activity: ${activity}`);
      return null;
    }

    // Create points transaction
    const pointsTransaction = await PointsTransaction.create({
      userId,
      gamificationRuleId: rule.id,
      points: rule.points,
    }, { transaction });

    // Calculate new total points
    const allTransactions = await PointsTransaction.findAll({
      where: { userId },
      attributes: ['points'],
      transaction
    });

    const totalPoints = allTransactions.reduce((sum, t) => sum + t.points, 0);
    const newLevel = calculateLevel(totalPoints);

    console.log(`✅ Awarded ${rule.points} points to user ${userId} for ${activity}`);

    // Check for badge unlocks based on points and activity
    await checkBadgeUnlocks(userId, totalPoints, activity);

    return {
      pointsAwarded: rule.points,
      totalPoints,
      level: newLevel,
      activity,
      transactionId: pointsTransaction.id,
      rule: {
        id: rule.id,
        description: rule.description,
        descriptionFr: rule.descriptionFr,
        descriptionAr: rule.descriptionAr
      }
    };
  } catch (error) {
    console.error('❌ Error awarding points:', error);
    throw error;
  }
}

/**
 * Calculate level based on total points
 * Level progression: 
 * - Level 1: 0-99 points
 * - Level 2: 100-249 points
 * - Level 3: 250-499 points
 * - Level 4+: Every 250 points
 */
function calculateLevel(totalPoints) {
  if (totalPoints < 100) return 1;
  if (totalPoints < 250) return 2;
  if (totalPoints < 500) return 3;
  return Math.floor((totalPoints - 250) / 250) + 3;
}

/**
 * Get user's total points and level
 */
async function getUserPoints(userId) {
  try {
    const transactions = await PointsTransaction.findAll({
      where: { userId },
      attributes: ['points'],
    });

    const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
    const level = calculateLevel(totalPoints);

    return {
      totalPoints,
      level,
      pointsToNextLevel: getPointsToNextLevel(totalPoints)
    };
  } catch (error) {
    console.error('❌ Error getting user points:', error);
    return { totalPoints: 0, level: 1, pointsToNextLevel: 100 };
  }
}

/**
 * Calculate points needed for next level
 */
function getPointsToNextLevel(currentPoints) {
  const currentLevel = calculateLevel(currentPoints);
  
  if (currentLevel === 1) return 100 - currentPoints;
  if (currentLevel === 2) return 250 - currentPoints;
  if (currentLevel === 3) return 500 - currentPoints;
  
  const nextLevelThreshold = 250 + ((currentLevel - 2) * 250);
  return nextLevelThreshold - currentPoints;
}

/**
 * Get user's recent activities
 */
async function getRecentActivities(userId, limit = 10) {
  try {
    const transactions = await PointsTransaction.findAll({
      where: { userId },
      include: [{
        model: require('../models').GamificationRule,
        as: 'gamificationRule',
        attributes: ['activity', 'description', 'descriptionFr', 'descriptionAr']
      }],
      order: [['createdAt', 'DESC']],
      limit,
    });

    return transactions;
  } catch (error) {
    console.error('❌ Error getting recent activities:', error);
    return [];
  }
}

/**
 * Check and award streak bonuses
 */
async function checkStreakBonus(userId) {
  try {
    // Get user's last login
    const user = await User.findByPk(userId);
    const lastLogin = user.lastLoginDate;
    const today = new Date();
    
    if (!lastLogin) {
      // First login
      await awardPoints(userId, 'DAILY_LOGIN');
      await user.update({ lastLoginDate: today });
      return;
    }

    const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day login
      await awardPoints(userId, 'DAILY_LOGIN');
      
      // Check for weekly streak
      const loginStreak = (user.loginStreak || 0) + 1;
      await user.update({ 
        lastLoginDate: today,
        loginStreak 
      });
      
      if (loginStreak >= 7) {
        await awardPoints(userId, 'WEEKLY_STREAK');
      }
      if (loginStreak >= 30) {
        await awardPoints(userId, 'MONTHLY_STREAK');
      }
    } else if (daysDiff > 1) {
      // Streak broken
      await user.update({ 
        lastLoginDate: today,
        loginStreak: 1 
      });
      await awardPoints(userId, 'DAILY_LOGIN');
    }
  } catch (error) {
    console.error('❌ Error checking streak bonus:', error);
  }
}

/**
 * Award points for POI visit with special conditions
 */
async function awardPOIVisit(userId, poiId, metadata = {}) {
  try {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Base POI visit points
    await awardPoints(userId, 'VISIT_POI', metadata);
    
    // Check for first POI visit
    const visitCount = await PointsTransaction.count({
      where: { userId },
      include: [{
        model: require('../models').GamificationRule,
        as: 'gamificationRule',
        where: { activity: 'VISIT_POI' }
      }]
    });
    
    if (visitCount === 1) {
      await awardPoints(userId, 'VISIT_FIRST_POI');
    } else if (visitCount === 5) {
      await awardPoints(userId, 'VISIT_5_POIS');
    } else if (visitCount === 10) {
      await awardPoints(userId, 'VISIT_10_POIS');
    } else if (visitCount === 25) {
      await awardPoints(userId, 'VISIT_25_POIS');
    } else if (visitCount === 50) {
      await awardPoints(userId, 'VISIT_50_POIS');
    }
    
    // Time-based bonuses
    if (hour >= 20 || hour <= 6) {
      await awardPoints(userId, 'NIGHT_EXPLORER');
    } else if (hour >= 5 && hour <= 8) {
      await awardPoints(userId, 'EARLY_BIRD');
    }
    
    // Weekend bonus
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      await awardPoints(userId, 'WEEKEND_WARRIOR');
    }
    
  } catch (error) {
    console.error('❌ Error awarding POI visit:', error);
  }
}

/**
 * Award points for circuit completion
 */
async function awardCircuitCompletion(userId, circuitId, isPremium = false) {
  try {
    const pointsAwarded = [];
    let totalPoints = 0;
    
    // Award based on circuit type
    const activity = isPremium ? 'COMPLETE_PREMIUM_CIRCUIT' : 'COMPLETE_CIRCUIT';
    const mainAward = await awardPoints(userId, activity);
    if (mainAward) {
      pointsAwarded.push({
        activity,
        points: mainAward.pointsAwarded,
        description: mainAward.rule?.descriptionFr || mainAward.rule?.description || 'Circuit complété'
      });
      totalPoints += mainAward.pointsAwarded;
    }
    
    // Check for milestone circuits (count AFTER awarding main points)
    const circuitCount = await PointsTransaction.count({
      where: { userId },
      include: [{
        model: require('../models').GamificationRule,
        as: 'rule',
        where: { 
          activity: ['COMPLETE_CIRCUIT', 'COMPLETE_PREMIUM_CIRCUIT']
        }
      }]
    });
    
    if (circuitCount === 1) {
      const firstAward = await awardPoints(userId, 'COMPLETE_FIRST_CIRCUIT');
      if (firstAward) {
        pointsAwarded.push({
          activity: 'COMPLETE_FIRST_CIRCUIT',
          points: firstAward.pointsAwarded,
          description: firstAward.rule?.descriptionFr || firstAward.rule?.description || 'Premier circuit complété'
        });
        totalPoints += firstAward.pointsAwarded;
      }
    } else if (circuitCount === 5) {
      const fiveAward = await awardPoints(userId, 'COMPLETE_5_CIRCUITS');
      if (fiveAward) {
        pointsAwarded.push({
          activity: 'COMPLETE_5_CIRCUITS',
          points: fiveAward.pointsAwarded,
          description: fiveAward.rule?.descriptionFr || fiveAward.rule?.description || '5 circuits complétés'
        });
        totalPoints += fiveAward.pointsAwarded;
      }
    } else if (circuitCount === 10) {
      const tenAward = await awardPoints(userId, 'COMPLETE_10_CIRCUITS');
      if (tenAward) {
        pointsAwarded.push({
          activity: 'COMPLETE_10_CIRCUITS',
          points: tenAward.pointsAwarded,
          description: tenAward.rule?.descriptionFr || tenAward.rule?.description || '10 circuits complétés'
        });
        totalPoints += tenAward.pointsAwarded;
      }
    }
    
    return {
      success: true,
      totalPoints,
      pointsAwarded
    };
    
  } catch (error) {
    console.error('❌ Error awarding circuit completion:', error);
    return {
      success: false,
      totalPoints: 0,
      pointsAwarded: []
    };
  }
}

/**
 * Award points for leaving a review
 */
async function awardReview(userId, reviewId, isDetailed = false) {
  try {
    await awardPoints(userId, 'LEAVE_REVIEW');
    
    // Check for first review
    const reviewCount = await PointsTransaction.count({
      where: { userId },
      include: [{
        model: require('../models').GamificationRule,
        as: 'gamificationRule',
        where: { activity: 'LEAVE_REVIEW' }
      }]
    });
    
    if (reviewCount === 1) {
      await awardPoints(userId, 'FIRST_REVIEW');
    } else if (reviewCount === 5) {
      await awardPoints(userId, 'LEAVE_5_REVIEWS');
    }
    
    // Bonus for detailed reviews (more than 100 characters)
    if (isDetailed) {
      await awardPoints(userId, 'LOCAL_GUIDE');
    }
    
  } catch (error) {
    console.error('❌ Error awarding review:', error);
  }
}

/**
 * Check and award badges based on points and activities
 */
async function checkBadgeUnlocks(userId, totalPoints, activity) {
  try {
    // Get badges user doesn't have yet
    const existingBadges = await UserBadge.findAll({
      where: { userId },
      attributes: ['badgeId'],
    });

    const existingBadgeIds = existingBadges.map(ub => ub.badgeId);

    // Find badges user can unlock
    const availableBadges = await Badge.findAll({
      where: existingBadgeIds.length > 0 ? {
        id: { [require('sequelize').Op.notIn]: existingBadgeIds }
      } : {},
    });

    for (const badge of availableBadges) {
      let shouldUnlock = false;

      // Check point-based badges
      if (badge.requiredPoints && totalPoints >= badge.requiredPoints) {
        shouldUnlock = true;
      }

      // Check activity-based badges
      if (badge.requiredActivity && badge.requiredActivity === activity) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        await UserBadge.create({
          userId,
          badgeId: badge.id,
          earnedAt: new Date()
        });

        console.log(`🏆 User ${userId} unlocked badge: ${badge.nameEn || badge.nameFr}`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking badge unlocks:', error);
  }
}

module.exports = {
  awardPoints,
  getUserPoints,
  calculateLevel,
  getPointsToNextLevel,
  getRecentActivities,
  checkStreakBonus,
  awardPOIVisit,
  awardCircuitCompletion,
  awardReview,
  checkBadgeUnlocks,
};