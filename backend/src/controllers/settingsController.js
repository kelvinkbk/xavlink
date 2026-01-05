const prisma = require("../config/prismaClient");
const bcrypt = require("bcryptjs");

// Helper to ensure a settings row exists with sensible defaults
async function ensureUserSettings(userId) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId }, // defaults come from Prisma schema
  });
}

exports.getSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await ensureUserSettings(userId);

    res.json(settings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch settings", error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      isPrivateProfile,
      allowMessages,
      allowRequestsFromAll,
      emailNotifications,
      pushNotifications,
      requestNotifications,
      messageNotifications,
      activityNotifications,
      theme,
      language,
    } = req.body;

    await ensureUserSettings(userId);

    const updated = await prisma.userSettings.update({
      where: { userId },
      data: {
        ...(isPrivateProfile !== undefined && { isPrivateProfile }),
        ...(allowMessages !== undefined && { allowMessages }),
        ...(allowRequestsFromAll !== undefined && { allowRequestsFromAll }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(pushNotifications !== undefined && { pushNotifications }),
        ...(requestNotifications !== undefined && { requestNotifications }),
        ...(messageNotifications !== undefined && { messageNotifications }),
        ...(activityNotifications !== undefined && { activityNotifications }),
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
      },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update settings", error: error.message });
  }
};

// GET /api/settings/me
exports.getMySettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const settings = await ensureUserSettings(userId);
    res.json(settings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch settings", error: error.message });
  }
};

// PUT /api/settings/me
exports.updateMySettings = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      isPrivateProfile,
      allowMessages,
      allowRequestsFromAll,
      emailNotifications,
      pushNotifications,
      requestNotifications,
      messageNotifications,
      activityNotifications,
      theme,
      language,
    } = req.body;

    await ensureUserSettings(userId);

    const updated = await prisma.userSettings.update({
      where: { userId },
      data: {
        ...(isPrivateProfile !== undefined && { isPrivateProfile }),
        ...(allowMessages !== undefined && { allowMessages }),
        ...(allowRequestsFromAll !== undefined && { allowRequestsFromAll }),
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(pushNotifications !== undefined && { pushNotifications }),
        ...(requestNotifications !== undefined && { requestNotifications }),
        ...(messageNotifications !== undefined && { messageNotifications }),
        ...(activityNotifications !== undefined && { activityNotifications }),
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
      },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update settings", error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old and new passwords are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to change password", error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ message: "Password is required to delete account" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete account", error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, bio, profilePic } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(profilePic && { profilePic }),
      },
    });

    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update profile", error: error.message });
  }
};
