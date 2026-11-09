import express from "express";
import {
  createEvent,
  getMyEvents,
  updateEventStatus,
  updateEvent,
  markAttendance,
  approveRejectPayment,
  processQRScan,
  getAttendanceDashboard,
  exportAttendanceCSV,
  getEventRegistrations,
  getPublishedEvents,
  getEventById,
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
} from "../controllers/eventcontroller.js";
import { verifyToken } from "../middleware/authmiddleware.js";
import { authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();
// public routes 
router.get("/", getPublishedEvents);
//participant routes
router.get(
  "/my-registrations",
  verifyToken,
  authorizeRoles("participant"),
  getMyRegistrations
);
router.post(
  "/:eventId/register",
  verifyToken,
  authorizeRoles("participant"),
  registerForEvent
);
router.delete(
  "/:eventId/cancel",
  verifyToken,
  authorizeRoles("participant"),
  cancelRegistration
);

//organizeer routes 
router.post("/", verifyToken, authorizeRoles("organizer"), createEvent);
router.get("/my-events", verifyToken, authorizeRoles("organizer"), getMyEvents);
router.patch(
  "/:eventId/status",
  verifyToken,
  authorizeRoles("organizer"),
  updateEventStatus
);
router.put("/:eventId", verifyToken, authorizeRoles("organizer"), updateEvent);
router.post(
  "/:eventId/attendance/:ticketId",
  verifyToken,
  authorizeRoles("organizer"),
  markAttendance
);
router.get(
  "/:eventId/registrations",
  verifyToken,
  authorizeRoles("organizer"),
  getEventRegistrations
);
router.patch(
  "/:eventId/registrations/:registrationId/payment",
  verifyToken,
  authorizeRoles("organizer"),
  approveRejectPayment
);
// QR Scanner & Attendance tracking
router.post(
  "/:eventId/qr-scan",
  verifyToken,
  authorizeRoles("organizer"),
  processQRScan
);
router.get(
  "/:eventId/attendance-dashboard",
  verifyToken,
  authorizeRoles("organizer"),
  getAttendanceDashboard
);
router.get(
  "/:eventId/attendance-export",
  verifyToken,
  authorizeRoles("organizer"),
  exportAttendanceCSV
);
// public dynamic routes
router.get("/:eventId", getEventById);

export default router;