import User from "../models/user.js";

// GET /api/users/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/users/preferences
// Protected: verifyToken, authorizeRoles("participant")
export const updatePreferences = async (req, res) => {
  try {
    const {
      interests,
      followedOrganizers,
      firstName,
      lastName,
      college,
      contactNumber,
      category,
      description,
      discordWebhook,
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (interests) {
      if (!Array.isArray(interests)) {
        return res
          .status(400)
          .json({ message: "interests must be an array." });
      }
      user.interests = interests;
    }

    if (followedOrganizers) {
      if (!Array.isArray(followedOrganizers)) {
        return res
          .status(400)
          .json({ message: "followedOrganizers must be an array." });
      }
      user.followedOrganizers = followedOrganizers;
    }

    // Allow basic profile edits for participants from the Profile page
    if (typeof firstName === "string" && firstName.trim()) {
      user.firstName = firstName.trim();
    }
    if (typeof lastName === "string" && lastName.trim()) {
      user.lastName = lastName.trim();
    }
    if (typeof college === "string") {
      user.college = college.trim();
    }
    if (typeof contactNumber === "string") {
      user.contactNumber = contactNumber.trim();
    }

    // Allow extended profile edits for organizers
    if (user.role === "organizer") {
      if (typeof category === "string") user.category = category.trim();
      if (typeof description === "string") user.description = description.trim();
      if (typeof discordWebhook === "string") user.discordWebhook = discordWebhook.trim();
    }

    await user.save();
    res.status(200).json({ message: "Preferences updated.", user });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/users/organizers
// Public-style list of approved organizers for the participant "Clubs / Organizers" page
export const getPublicOrganizers = async (_req, res) => {
  try {
    const organizers = await User.find({ role: "organizer", isActive: true })
      .select("firstName lastName email college contactNumber createdAt")
      .sort({ createdAt: 1 });

    res.status(200).json({ organizers });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export default { getMe, updatePreferences, getPublicOrganizers };
