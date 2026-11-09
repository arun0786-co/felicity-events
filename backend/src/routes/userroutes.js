import express from "express";
import {
  getMe,
  updatePreferences,
  getPublicOrganizers,
} from "../controllers/usercontroller.js";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

router.get("/me", verifyToken, getMe);
router.patch(
  "/preferences",
  verifyToken,
  authorizeRoles("participant", "organizer"),
  updatePreferences
);

// Public list of organizers for participant "Clubs / Organizers" page
router.get("/organizers", getPublicOrganizers);

export default router;
