const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/direct", chatController.getOrCreateDirectChat);
router.post("/group", chatController.createGroupChat);
router.get("/", chatController.getUserChats);
router.get("/:chatId", chatController.getChatDetails);
router.get("/:chatId/messages", chatController.getChatMessages);
router.post("/:chatId/messages", chatController.sendMessage);
router.delete("/:chatId/messages/:messageId", chatController.deleteMessage);
router.post("/:chatId/messages/:messageId/react", chatController.addReaction);
router.get(
  "/:chatId/messages/:messageId/reactions",
  chatController.getReactions
);
router.patch(
  "/:chatId/messages/:messageId/pin",
  chatController.togglePinMessage
);
router.post("/:chatId/messages/:messageId/read", chatController.markAsRead);
router.post("/:chatId/read", chatController.markChatAsRead);
router.get("/:chatId/search", chatController.searchMessages);

module.exports = router;
