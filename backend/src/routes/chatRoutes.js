const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/direct", chatController.getOrCreateDirectChat);
router.post("/group", chatController.createGroupChat);
router.get("/", chatController.getUserChats);
router.get("/:chatId/messages", chatController.getChatMessages);
router.post("/:chatId/messages", chatController.sendMessage);
router.delete("/:chatId/messages/:messageId", chatController.deleteMessage);

module.exports = router;
