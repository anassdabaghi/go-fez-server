const xss = require('xss');
const { GamificationRule } = require('../models');
const { GAMIFICATIONS_ENUM } = require('../constants/gamifications');
const PointsTransaction = require('../models/PointsTransaction');
const { User } = require('../models/User');

/**
 * Create a new gamification rule.
 * Expects: points, descriptionAr, descriptionFr, description, isActive, activity: enum(
				"COMPLETE_REGISTRATION",
				"COMPLETE_CIRCUIT",
				"COMPLETE_PREMIUM_CIRCUIT",
				"SHARE_WITH_FRIEND",
				"LEAVE_REVIEW",
				"VISIT_POI") in req.body
 */
async function createGamificationRule(req, res) {
  try {
    const {
      points,
      activity,
      isActive,
      description,
      descriptionAr,
      descriptionFr,
    } = req.body;

    [(null, undefined)].forEach((el) => {
      if (
        [
          points,
          activity,
          isActive,
          description,
          descriptionAr,
          descriptionFr,
        ].includes(el)
      ) {
        res.status(400).json({
          status: 'failure',
          data: 'failed to create gamification rule, arguments missing',
        });
        return;
      }
    });
    if (!GAMIFICATIONS_ENUM.includes(activity)) {
      res.status(400).json({
        status: 'failure',
        data: 'invalid value for field activity',
      });
      return;
    }
    const gamification_rule = await GamificationRule.create({
      points,
      activity,
      isActive,
      description: xss(description),
      descriptionAr: xss(descriptionAr),
      descriptionFr: xss(descriptionFr),
    });

    res.status(201).json({ status: 'success', data: gamification_rule });
  } catch (error) {
    console.error('server erreur in gamification rule creation:', error);
    res.status(500).json({
      status: 'server_failure',
      message: 'Server Error',
    });
  }
}
/**
 * Update an existing gamification rule.
 * Expects: id in req.body, and any of points, descriptionAr, descriptionFr, description, isActive, activity in req.body to update.
 */
async function updateGamificationRule(req, res) {
  try {
    const {
      id,
      points,
      activity,
      isActive,
      description,
      descriptionAr,
      descriptionFr,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 'failure',
        data: 'id is required to update gamification rule',
      });
    }

    const updateFields = {};
    if (points !== undefined) updateFields.points = points;
    if (activity !== undefined) {
      if (!GAMIFICATIONS_ENUM.includes(activity)) {
        return res.status(400).json({
          status: 'failure',
          data: 'invalid value for field activity',
        });
      }
      updateFields.activity = activity;
    }
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (description !== undefined) updateFields.description = xss(description);
    if (descriptionAr !== undefined)
      updateFields.descriptionAr = xss(descriptionAr);
    if (descriptionFr !== undefined)
      updateFields.descriptionFr = xss(descriptionFr);

    const [updatedRowsCount, updatedRows] = await GamificationRule.update(
      updateFields,
      {
        where: { id },
        returning: true,
      }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        status: 'failure',
        data: 'gamification rule not found',
      });
    }
    res.status(200).json({ status: 'success', data: updatedRows[0] });
  } catch (error) {
    console.error('server error in gamification rule update:', error);
    res.status(500).json({
      status: 'server_failure',
      message: 'Server Error',
    });
  }
}
async function getGamificationByName(gamification) {
  if (!gamification || !GAMIFICATIONS_ENUM.includes(gamification)) {
    throw new Error('invalid gamification name');
  }
  const gamificationRule = await GamificationRule.findOne({
    where: { activity: gamification },
  });
  return gamificationRule;
}

async function completeGamificatedTask(req, res) {
  try {
    const { userId, gamificationRuleName } = req.body;
    if (!userId || !GAMIFICATIONS_ENUM.includes(gamificationRuleName)) {
      res.status(400).json({
        status: 'failure',
        data: 'enter valid values for user id and gamification rule',
      });
      return;
    }
    const userExist = await User.findOne({ where: { id: userId } });
    if (!userExist) {
      return res.status(404).json({
        status: 'failure',
        data: 'user not found',
      });
    }
    const gamificationRule = await getGamificationByName(gamificationRuleName);
    if (!gamificationRule) {
      return res.status(404).json({
        status: 'failure',
        data: 'gamification rule not found',
      });
    }
    const pointsTransaction = await PointsTransaction.create({
      userId,
      gamificationRuleId: gamificationRule.id,
      points: gamificationRule.points,
      activity: gamificationRule.activity,
      description: gamificationRule.description,
      descriptionAr: gamificationRule.descriptionAr,
      descriptionFr: gamificationRule.descriptionFr,
    });
    //update user points INCREMENT
    res.status(201).json({ status: 'success', data: pointsTransaction });
  } catch (error) {
    console.error('server error in completing gamificated task:', error);
    res.status(500).json({
      status: 'failure',
      data: 'server error occured',
    });
  }
}

async function claimGamificatedTaskById(req, res) {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      res.status(400).json({
        status: 'failure',
        data: 'enter valid values for task id',
      });
      return;
    }
    const userId = req.user.userId;

    const pointsTransaction = await PointsTransaction.findOne({
      where: {
        userId,
        id: taskId,
      },
    });
    if (!pointsTransaction) {
      return res.status(404).json({
        status: 'failure',
        data: 'points transaction not found',
      });
    }
    if (pointsTransaction.isClaimed) {
      return res.status(400).json({
        status: 'failure',
        data: 'points already claimed',
      });
    }
    pointsTransaction.isClaimed = true;
    await pointsTransaction.save();

    res.status(200).json({ status: 'success', data: pointsTransaction });
  } catch (error) {
    console.error('server error in claiming gamificated task:', error);
    res.status(500).json({
      status: 'failure',
      data: 'server error occured',
      descriptionAr: gamificationRule.descriptionAr,
      descriptionFr: gamificationRule.descriptionFr,
    });
    //update user points INCREMENT
    res.status(201).json({ status: 'success', data: pointsTransaction });
  }
}

async function completeGamificatedTaskAuthenticated(req, res) {
  try {
    const { gamificationRuleName } = req.body;
    if (
      !gamificationRuleName ||
      !GAMIFICATIONS_ENUM.includes(gamificationRuleName)
    ) {
      res.status(400).json({
        status: 'failure',
        data: 'enter valid values for user id and gamification rule',
      });
      return;
    }
    const userId = req.user.userId;
    const gamificationRule = await getGamificationByName(gamificationRuleName);
    const pointsTransaction = await PointsTransaction.create({
      userId,
      gamificationRuleId: gamificationRule.id,
      points: gamificationRule.points,
      activity: gamificationRule.activity,
      description: gamificationRule.description,
      descriptionAr: gamificationRule.descriptionAr,
      descriptionFr: gamificationRule.descriptionFr,
    });
    //update user points INCREMENT
    res.status(201).json({ status: 'success', data: pointsTransaction });
  } catch (error) {
    console.error('server error in completing gamificated task:', error);
    res.status(500).json({
      status: 'failure',
      data: 'server error occured',
    });
  }
}
async function name(params) {
  //update user points DECREMENT
}

/**
 * Get gamification profile for the authenticated user
 * Returns user points and badges
 */
async function getGamificationProfile(req, res) {
  try {
    const userId = req.user.userId;

    // Get user
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'profileImage'],
      include: [
        {
          model: require('../models').Badge,
          as: 'badges',
          through: {
            attributes: ['earnedAt'],
            as: 'userBadge',
          },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate total points from transactions (include all transactions)
    const transactions = await PointsTransaction.findAll({
      where: { userId },
      attributes: ['points'],
    });

    // Sum all points (consistent with leaderboard calculation)
    const totalPoints = transactions.reduce((sum, t) => sum + (t.points || 0), 0);

    // Calculate level (100 points per level)
    const level = Math.floor(totalPoints / 100) + 1;

    res.status(200).json({
      success: true,
      data: {
        points: {
          totalPoints,
          level,
        },
        badges: user.badges || [],
      },
    });
  } catch (error) {
    console.error('Error fetching gamification profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
}
/**
 * Get gamification history for the authenticated user
 * Returns all points transactions for the user
 */
async function getGamificationHistory(req, res) {
  try {
    const userId = req.user.userId;

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get all points transactions for the user with gamification rule details
    const transactions = await PointsTransaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: GamificationRule,
          as: 'rule',
          attributes: [
            'id',
            'activity',
            'description',
            'descriptionAr',
            'descriptionFr',
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching gamification history:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
}

/**
 * Get leaderboard
 * Returns top users by points
 */
async function getLeaderboard(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get all users with their total points from transactions
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'profileImage'],
    });

    // Calculate points for each user
    const usersWithPoints = await Promise.all(
      users.map(async (user) => {
        const transactions = await PointsTransaction.findAll({
          where: { userId: user.id },
          attributes: ['points'],
        });

        const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);
        const level = Math.floor(totalPoints / 100) + 1;

        return {
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.profileImage,
            id: user.id,
          },
          totalPoints,
          level,
        };
      })
    );

    const leaderboard = usersWithPoints
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
}
async function seedDefaultGamifications() {
  try {
    const defaultGamifications = [
      {
        activity: 'COMPLETE_REGISTRATION',
        points: 10,
        description: 'Complete registration',
        descriptionAr: 'إكمال التسجيل',
        descriptionFr: 'Inscription complète',
        isActive: true,
      },
      {
        activity: 'COMPLETE_PROFILE',
        points: 15,
        description: 'Complete your profile',
        descriptionAr: 'أكمل ملفك الشخصي',
        descriptionFr: 'Complétez votre profil',
        isActive: true,
      },
      {
        activity: 'ADD_PROFILE_PICTURE',
        points: 5,
        description: 'Add a profile picture',
        descriptionAr: 'أضف صورة ملف شخصي',
        descriptionFr: 'Ajouter une photo de profil',
        isActive: true,
      },
      {
        activity: 'SHARE_WITH_FRIEND',
        points: 20,
        description: 'Share with a friend',
        descriptionAr: 'شارك مع صديق',
        descriptionFr: 'Partager avec un ami',
        isActive: true,
      },
      {
        activity: 'LEAVE_REVIEW',
        points: 25,
        description: 'Leave a review',
        descriptionAr: 'اترك تقييمًا',
        descriptionFr: 'Laisser un avis',
        isActive: true,
      },
      {
        activity: 'DAILY_LOGIN',
        points: 5,
        description: 'Daily login',
        descriptionAr: 'تسجيل الدخول اليومي',
        descriptionFr: 'Connexion quotidienne',
        isActive: true,
      },
    ];

    for (const gamification of defaultGamifications) {
      await GamificationRule.findOrCreate({
        where: { activity: gamification.activity },
        defaults: gamification,
      });
    }

    console.log('Default gamifications seeded successfully');
  } catch (error) {
    console.error('Error seeding gamifications:', error);
  }
}

module.exports = {
  createGamificationRule,
  updateGamificationRule,
  completeGamificatedTask,
  claimGamificatedTaskById,
  seedDefaultGamifications,
  completeGamificatedTaskAuthenticated,
  getGamificationProfile,
  getGamificationHistory,
  getLeaderboard,
};
