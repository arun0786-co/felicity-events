import express from "express";
import {
  requestPasswordReset,
  processPasswordReset,
  getPendingRequests,
} from "../controllers/passwordresetcontroller.js";
import { verifyToken, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Organizer routes
router.post(
  "/request",
  verifyToken,
  authorizeRoles("organizer"),
  requestPasswordReset
);

// Admin routes
router.get(
  "/requests",
  verifyToken,
  authorizeRoles("admin"),
  getPendingRequests
);

router.patch(
  "/:requestId",
  verifyToken,
  authorizeRoles("admin"),
  processPasswordReset
);

export default router;
