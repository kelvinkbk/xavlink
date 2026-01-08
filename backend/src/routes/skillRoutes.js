const express = require("express");
const {
	addSkill,
	getSkillsByUser,
	deleteSkill,
	searchSkills,
} = require("../controllers/skillController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// RESTful endpoints used by the web and mobile clients
router.get("/", getSkillsByUser);
router.post("/", authMiddleware, addSkill);
router.delete("/:id", authMiddleware, deleteSkill);

// Legacy endpoints kept for backward compatibility
router.post("/add", authMiddleware, addSkill);
router.get("/all", searchSkills);

module.exports = router;
