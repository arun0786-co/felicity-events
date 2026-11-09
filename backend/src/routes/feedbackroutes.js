import express from "express";
import {
  submitFeedback,
  getEventFeedback,
} from "../controllers/feedbackcontroller.js";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Participant submits feedback
router.post(
  "/:eventId",
  verifyToken,
  authorizeRoles("participant"),
  submitFeedback
);

// Organizer views feedback
router.get(
  "/:eventId",
  verifyToken,
  authorizeRoles("organizer"),
  getEventFeedback
);

export default router;
