import bcrypt from "bcrypt";
import User from "../models/user.js";
import Event from "../models/event.js";
import Registration from "../models/registration.js";

// ORGANIZER MANAGEMENT

// POST /api/admin/organizers
// Create an organizer account — only admin can do this
export const createOrganizer = async (req, res) => {
  try {
    const { firstName, lastName, email, password, college, contactNumber } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!firstName || !lastName || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "first name, last name, email and password are required." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const organizer = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "organizer",
      college,
      contactNumber,
      isActive: true,
    });

    res.status(201).json({
      message: "Organizer account created successfully.",
      organizer: {
        id: organizer._id,
        firstName: organizer.firstName,
        lastName: organizer.lastName,
        email: organizer.email,
        isActive: organizer.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/admin/organizers
// View all organizer accounts
export const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: "organizer" }).select(
      "firstName lastName email isActive createdAt"
    );

    res.status(200).json({ organizers });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/admin/organizers/:id/disable
// Disable an organizer — does NOT delete
export const disableOrganizer = async (req, res) => {
  try {
    const organizer = await User.findOne({ _id: req.params.id, role: "organizer" });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    if (!organizer.isActive) {
      return res.status(400).json({ message: "Organizer is already disabled." });
    }

    organizer.isActive = false;
    await organizer.save();

    res.status(200).json({ message: "Organizer disabled successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/admin/organizers/:id/enable
// Re-enable a disabled organizer
export const enableOrganizer = async (req, res) => {
  try {
    const organizer = await User.findOne({ _id: req.params.id, role: "organizer" });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found." });
    }

    if (organizer.isActive) {
      return res.status(400).json({ message: "Organizer is already active." });
    }

    organizer.isActive = true;
    await organizer.save();

    res.status(200).json({ message: "Organizer enabled successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PARTICIPANT MANAGEMENT

// GET /api/admin/participants
// View all participants
export const getAllParticipants = async (req, res) => {
  try {
    const participants = await User.find({ role: "participant" }).select(
      "firstName lastName email participantType college isActive createdAt"
    );

    res.status(200).json({ participants });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PLATFORM ANALYTICS

// GET /api/admin/analytics
// High-level platform stats
export const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrganizers,
      totalParticipants,
      totalEvents,
      publishedEvents,
      totalRegistrations,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "organizer" }),
      User.countDocuments({ role: "participant" }),
      Event.countDocuments(),
      Event.countDocuments({ status: "published" }),
      Registration.countDocuments({ status: "registered" }),
    ]);

    res.status(200).json({
      analytics: {
        totalUsers,
        totalOrganizers,
        totalParticipants,
        totalEvents,
        publishedEvents,
        totalRegistrations,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/admin/events
// Admin view of ALL events regardless of status
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizer", "firstName lastName email isActive")
      .sort({ createdAt: -1 });

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
