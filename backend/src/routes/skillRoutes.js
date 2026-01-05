const express = require('express');
const { addSkill, searchSkills } = require('../controllers/skillController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/add', authMiddleware, addSkill);
router.get('/all', searchSkills);

module.exports = router;
