import User from "../models/user.js";
import PasswordResetRequest from "../models/passwordresetrequest.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

// POST /api/organizer/password-reset/request
// Protected: verifyToken, authorizeRoles("organizer")
export const requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body;

    // Check if organizer already has pending request
    const existing = await PasswordResetRequest.findOne({
      organizer: req.user.userId,
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({
        message: "You already have a pending password reset request.",
      });
    }

    // Create new request with optional reason
    const request = await PasswordResetRequest.create({
      organizer: req.user.userId,
      status: "pending",
      reason: reason || "",
    });

    res.status(201).json({
      message: "Password reset request created. Awaiting admin approval.",
      requestId: request._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/admin/password-reset/:requestId
// Protected: verifyToken, authorizeRoles("admin")
// Admin approves/rejects and sets new password if approved
export const processPasswordReset = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminComment } = req.body;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use 'approved' or 'rejected'.",
      });
    }

    // Find request
    const request = await PasswordResetRequest.findById(requestId).populate(
      "organizer"
    );
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Ensure request is pending
    if (request.status !== "pending") {
      return res.status(400).json({
        message: `Cannot change status from "${request.status}".`,
      });
    }

    // Ensure target is actually an organizer
    if (request.organizer.role !== "organizer") {
      return res.status(400).json({
        message: "Password reset only applies to organizers.",
      });
    }

    // If rejecting, just update status and comment
    if (status === "rejected") {
      request.status = "rejected";
      request.adminComment = adminComment || "";
      request.processedBy = req.user.userId;
      request.processedAt = new Date();
      await request.save();
      return res.status(200).json({
        message: "Password reset request rejected.",
        request,
      });
    }

    // If approving, generate new password and update organizer
    if (status === "approved") {
      const organizer = await User.findById(request.organizer._id);
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found." });
      }

      // Prevent resetting password for disabled organizer
      if (!organizer.isActive) {
        return res.status(400).json({
          message: "Cannot reset password for disabled organizer.",
        });
      }

      const newPassword = uuidv4().slice(0, 12); // Generate 12-char random password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update organizer password
      organizer.password = hashedPassword;
      await organizer.save();

      // Update request status, comment, and audit trail
      request.status = "approved";
      request.adminComment = adminComment || "";
      request.processedBy = req.user.userId;
      request.processedAt = new Date();
      await request.save();

      return res.status(200).json({
        message: "Password reset approved.",
        request,
        newPassword, // Return plain password once to admin for communication
        organizerEmail: organizer.email,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/admin/password-reset/requests
// Protected: verifyToken, authorizeRoles("admin")
// Get all password reset requests with history
export const getPendingRequests = async (req, res) => {
  try {
    const { status } = req.query; // Optional filter: pending, approved, rejected

    const query = {};
    if (status) query.status = status;

    const requests = await PasswordResetRequest.find(query)
      .populate("organizer", "firstName lastName email role college")
      .populate("processedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export default { requestPasswordReset, processPasswordReset, getPendingRequests };
