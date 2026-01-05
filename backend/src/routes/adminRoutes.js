const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  getStats,
  listUsers,
  updateUserRole,
  setSuspended,
  deleteUser,
  setVerified,
  updateUserDetails,
  bulkSetSuspended,
  bulkDeleteUsers,
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/stats", getStats);
router.get("/users", listUsers);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/suspend", setSuspended);
router.patch("/users/:id/verified", setVerified);
router.patch("/users/:id/details", updateUserDetails);
router.post("/users/bulk/suspend", bulkSetSuspended);
router.post("/users/bulk/delete", bulkDeleteUsers);
router.delete("/users/:id", deleteUser);

module.exports = router;
