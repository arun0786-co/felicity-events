import express from "express";
import {
  createOrganizer,
  getAllOrganizers,
  disableOrganizer,
  enableOrganizer,
  getAllParticipants,
  getAnalytics,
  getAllEvents,
} from "../controllers/admincontroller.js";
import { verifyToken } from "../middleware/authmiddleware.js";
import { authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(verifyToken, authorizeRoles("admin"));

// Organizer management
router.post("/organizers", createOrganizer);
router.get("/organizers", getAllOrganizers);
router.patch("/organizers/:id/disable", disableOrganizer);
router.patch("/organizers/:id/enable", enableOrganizer);

// Participant management
router.get("/participants", getAllParticipants);

// Platform analytics
router.get("/analytics", getAnalytics);
router.get("/events", getAllEvents);

export default router;