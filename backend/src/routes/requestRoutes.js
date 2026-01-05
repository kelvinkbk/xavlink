const express = require('express');
const { sendRequest, getReceived, updateRequestStatus } = require('../controllers/requestController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send', authMiddleware, sendRequest);
router.get('/received/:userId', authMiddleware, getReceived);
router.put('/update/:id', authMiddleware, updateRequestStatus);

module.exports = router;
