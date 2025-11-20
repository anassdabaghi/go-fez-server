const { PointsTransaction, User, GamificationRule } = require("../models");

/**
 * Enregistre une nouvelle transaction de points.
 */

async function createPointsTransaction(req, res) {
  try {
    const { activity } = req.params;
    const userId = req.user.userId;

    console.log("Creating points transaction for userId:", userId);
    console.log(activity);

    if (!userId) {
      return res.status(400).json({
        status: "failure",
        message: "userId not authorized",
        code: "USER_ID_MISSING",
      });
    }

    // Vérifier l'existence de l'utilisateur
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: "failure",
        data: "User not found",
      });
    }

    // Récupérer la règle de gamification correspondante
    const gamification = await GamificationRule.findOne({
      where: { activity: activity },
    });

    if (!gamification) {
      return res.status(400).json({
        code: "GAMIFICATION_NOT_FOUND",
        message: "gamification non trouvée",
      });
    }

    // Déterminer le nombre de points
    const points = gamification.isActive ? gamification.points : 0;

    // Créer la transaction de points
    const transaction = await PointsTransaction.create({
      userId,
      gamificationRuleId: gamification.id,
      points,
    });

    res.status(201).json({ status: "success", data: transaction });
  } catch (error) {
    console.error("server error in points transaction creation:", error);
    res.status(500).json({
      status: "server_failure",
      message: "Server Error",
    });
  }
}


/**
 * Récupère toutes les transactions pour un utilisateur spécifique.
 */
async function findUserTransactions(req, res) {
    try {
    const userId = req.user.userId;
        if (!userId) {
            return res.status(400).json({
                status: "failure",
                data: "userId is required",
            });
        }

        const transactions = await PointsTransaction.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            include: [{ model: GamificationRule, as: 'gamificationRule' }], 
        });

        res.status(200).json({ status: "success", data: transactions });
    } catch (error) {
        console.error("server error in fetching user transactions:", error);
        res.status(500).json({
            status: "server_failure",
            message: "Server Error",
        });
    }
}

module.exports = { createPointsTransaction, findUserTransactions };