const express = require("express");
const GamificationRouter = express.Router();
const GamificationController = require("../controllers/gamificationController");
const {
	authenticateToken,
	authenticateHeaderToken,
} = require("../middleware/auth");

GamificationRouter.post(
	"/create",
	GamificationController.createGamificationRule
);

GamificationRouter.patch(
	"/update",
	GamificationController.updateGamificationRule
);

GamificationRouter.post(
	"/complete-gamification",
	GamificationController.completeGamificatedTask
);

GamificationRouter.post(
	"/no-cookies/complete-gamification",
	authenticateHeaderToken,
	GamificationController.completeGamificatedTaskAuthenticated
);

GamificationRouter.get(
	"/no-cookies/hasLogedInPreviouslyToday",
	authenticateHeaderToken,
	GamificationController.hasLogedInToday
);
GamificationRouter.post(
	"/no-cookies/claim-gamification",
	authenticateHeaderToken,
	GamificationController.claimGamificatedTaskById
);
// Get gamification profile for authenticated user
GamificationRouter.get(
	"/profile",
	authenticateToken,
	GamificationController.getGamificationProfile
);
GamificationRouter.get(
	"/no-cookies/profile",
	authenticateHeaderToken,
	GamificationController.getGamificationProfile
);
GamificationRouter.get(
	"/no-cookies/history",
	authenticateHeaderToken,
	GamificationController.getGamificationHistory
);

// Get leaderboard
GamificationRouter.get("/leaderboard", GamificationController.getLeaderboard);

// Get all gamification rules (admin)
GamificationRouter.get(
	"/rules",
	GamificationController.getAllGamificationRules
);

// Delete gamification rule (admin)
GamificationRouter.delete(
	"/rules/:id",
	GamificationController.deleteGamificationRule
);

module.exports = { GamificationRouter };
