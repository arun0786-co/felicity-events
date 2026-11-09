import express from "express";
import {
  postMessage,
  getMessages,
  getMessageReplies,
  deleteMessage,
  pinMessage,
  postAnnouncement,
  reactToMessage,
} from "../controllers/forumcontroller.js";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Public - get messages (no auth required for read-only)
router.get("/:eventId/messages", getMessages);
router.get("/:eventId/messages/:messageId/replies", getMessageReplies);

// Participant - post message
router.post(
  "/:eventId/messages",
  verifyToken,
  authorizeRoles("participant", "organizer"),
  postMessage
);

// React to message
router.post(
  "/:eventId/messages/:messageId/react",
  verifyToken,
  authorizeRoles("participant", "organizer"),
  reactToMessage
);

// Organizer - pin/unpin message
router.patch(
  "/:eventId/messages/:messageId/pin",
  verifyToken,
  authorizeRoles("organizer"),
  pinMessage
);

// Organizer - post announcement
router.post(
  "/:eventId/announcement",
  verifyToken,
  authorizeRoles("organizer"),
  postAnnouncement
);

// Delete message (author or organizer)
router.delete(
  "/:eventId/messages/:messageId",
  verifyToken,
  deleteMessage
);

export default router;
