import Event from "../models/event.js";
import Registration from "../models/registration.js";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";

const getOptionalAuthUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

// organiser routes 

// POST /api/events
// Protected: verifyToken, authorizeRoles("organizer")
export const createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      venue,
      eligibility,
      registrationDeadline,
      startDate,
      endDate,
      registrationLimit,
      registrationFee,
      tags,
      stockQuantity,
      purchaseLimitPerUser,
      merchandiseVariants,
    } = req.body;

    //  Merchandise events must declare stock upfront
    if (type === "merchandise" && (!stockQuantity || stockQuantity <= 0) && (!merchandiseVariants || merchandiseVariants.length === 0)) {
      return res.status(400).json({
        message: "Merchandise events require a stockQuantity greater than 0 or defined merchandiseVariants.",
      });
    }

    let eventData = {
      name,
      description,
      type,
      venue: type === "normal" ? venue : null,
      eligibility,
      registrationDeadline,
      startDate,
      endDate,
      registrationLimit,
      registrationFee,
      tags,
      organizer: req.user.userId,
      status: "draft",
    };

    if (type === "merchandise") {
      let variantsList = [];
      if (req.body.merchandiseVariants) {
        try {
          variantsList = typeof req.body.merchandiseVariants === "string"
            ? JSON.parse(req.body.merchandiseVariants)
            : req.body.merchandiseVariants;
        } catch (err) {
          console.warn("Failed to parse merchandiseVariants:", err.message);
        }
      }

      if (Array.isArray(variantsList) && variantsList.length > 0) {
        eventData.merchandiseVariants = variantsList.map(v => ({
          name: v.name?.trim() || String(v),
          stock: Number(v.stock) || 0
        }));
        eventData.stockQuantity = eventData.merchandiseVariants.reduce((sum, v) => sum + v.stock, 0);
      } else {
        eventData.stockQuantity = Number(stockQuantity) || 0;
      }

      eventData.purchaseLimitPerUser = Number(purchaseLimitPerUser) || 1;
    }

    if (type === "normal" && registrationLimit) {
      eventData.registrationLimit = Number(registrationLimit);
    }

    const event = await Event.create(eventData);
    res.status(201).json({ message: "Event created successfully.", event });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/events/my-events
// Protected: verifyToken, authorizeRoles("organizer")
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/events/:eventId/status
// Protected: verifyToken, authorizeRoles("organizer")
export const updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["draft", "published", "ongoing", "completed", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const event = await Event.findOne({
      _id: req.params.eventId,
      organizer: req.user.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    // Prevent backwards lifecycle transitions
    const irreversible = ["closed", "completed"];
    if (irreversible.includes(event.status)) {
      return res.status(400).json({
        message: `Cannot transition event from "${event.status}" back to "${status}". This state is final.`,
      });
    }

    const previousStatus = event.status;
    event.status = status;
    await event.save();

    // Trigger Discord Webhook if transitioning to "published"
    if (status === "published" && previousStatus !== "published") {
      try {
        const organizer = await User.findById(req.user.userId);
        if (organizer && organizer.discordWebhook) {
          const message = {
            content: `🎟️ **New Event Published:** ${event.name}!\n\n**Type:** ${event.type}\n**Date:** ${new Date(event.startDate).toLocaleDateString()}\n\n${event.description}`,
            username: "Felicity Event Bot",
          };
          // Fire and forget using native fetch
          fetch(organizer.discordWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          }).catch(err => {
            console.error("Failed to fire Discord webhook: ", err.message);
          });
        }
      } catch (err) {
        console.error("Failed to process Discord webhook logic: ", err.message);
      }
    }

    res.status(200).json({ message: `Event status updated to "${status}".`, event });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PUT /api/events/:eventId
// Protected: verifyToken, authorizeRoles("organizer")
// Enforce edit rules depending on lifecycle state
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizer: req.user.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    // No edits allowed when event is ongoing/completed/closed
    const noEditStates = ["ongoing", "completed", "closed"];
    if (noEditStates.includes(event.status)) {
      return res.status(400).json({ message: `Cannot edit event in status "${event.status}".` });
    }

    // Draft: allow full edits
    if (event.status === "draft") {
      Object.keys(req.body).forEach((key) => {
        // never allow changing organizer or immutable fields
        if (key === "organizer" || key === "_id" || key === "status") return;

        if (key === "merchandiseVariants" && event.type === "merchandise") {
          let variantsList = [];
          if (req.body.merchandiseVariants) {
            try {
              variantsList = typeof req.body.merchandiseVariants === "string"
                ? JSON.parse(req.body.merchandiseVariants)
                : req.body.merchandiseVariants;
            } catch (err) {
              console.warn("Failed to parse merchandiseVariants during update:", err.message);
              return; // Skip if invalid format
            }
          }

          if (Array.isArray(variantsList) && variantsList.length > 0) {
            event.merchandiseVariants = variantsList.map(v => ({
              name: v.name?.trim() || String(v),
              stock: Number(v.stock) || 0
            }));
            event.stockQuantity = event.merchandiseVariants.reduce((sum, v) => sum + v.stock, 0);
          } else if (req.body.merchandiseVariants !== undefined) { // If variants were explicitly cleared
            event.merchandiseVariants = [];
            event.stockQuantity = 0;
          }
        } else if (key === "stockQuantity" && event.type === "merchandise" && !req.body.merchandiseVariants) {
          // Only update stockQuantity directly if variants are not being updated
          event[key] = Number(req.body[key]);
        } else {
          event[key] = req.body[key];
        }
      });
      await event.save();
      return res.status(200).json({ message: "Event updated.", event });
    }

    // Published: limited edits only
    if (event.status === "published") {
      const allowed = new Set([
        "description",
        "venue",
        "tags",
        "registrationDeadline",
        "startDate",
        "endDate",
        "registrationFee",
        "registrationLimit",
        "stockQuantity",
        "merchandiseVariants",
      ]);

      let modified = false;
      Object.keys(req.body).forEach((key) => {
        if (allowed.has(key)) {
          if (key === "merchandiseVariants" && event.type === "merchandise") {
            let variantsList = [];
            if (req.body.merchandiseVariants) {
              try {
                variantsList = typeof req.body.merchandiseVariants === "string"
                  ? JSON.parse(req.body.merchandiseVariants)
                  : req.body.merchandiseVariants;
              } catch (err) {
                console.warn("Failed to parse merchandiseVariants during update:", err.message);
                return; // Skip if invalid format
              }
            }

            if (Array.isArray(variantsList) && variantsList.length > 0) {
              event.merchandiseVariants = variantsList.map(v => ({
                name: v.name?.trim() || String(v),
                stock: Number(v.stock) || 0
              }));
              event.stockQuantity = event.merchandiseVariants.reduce((sum, v) => sum + v.stock, 0);
              modified = true;
            } else if (req.body.merchandiseVariants !== undefined) {
              event.merchandiseVariants = [];
              event.stockQuantity = 0;
              modified = true;
            }
          } else if (key === "stockQuantity" && event.type === "merchandise" && !req.body.merchandiseVariants) {
            event[key] = Number(req.body[key]);
            modified = true;
          } else {
            event[key] = req.body[key];
            modified = true;
          }
        }
      });

      if (!modified) {
        return res.status(400).json({ message: "No allowed fields provided for update." });
      }

      await event.save();
      return res.status(200).json({ message: "Event updated (published).", event });
    }

    // Fallback
    res.status(400).json({ message: "Unable to apply update for event." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/events/:eventId/registrations
// Protected: verifyToken, authorizeRoles("organizer")
export const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      organizer: req.user.userId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    const registrations = await Registration.find({
      event: req.params.eventId,
    }).populate("user", "firstName lastName email college contactNumber");

    res.status(200).json({ registrations });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// POST /api/events/:eventId/attendance/:ticketId
// Protected: verifyToken, authorizeRoles("organizer")
export const markAttendance = async (req, res) => {
  try {
    const { eventId, ticketId } = req.params;
    // Ensure organizer only marks attendance for their own event
    const event = await Event.findOne({ _id: eventId, organizer: req.user.userId });
    if (!event) return res.status(404).json({ message: "Event not found or access denied." });

    const registration = await Registration.findOne({ ticketId, event: eventId });
    if (!registration) return res.status(404).json({ message: "Registration not found." });

    // Only active registrations may be marked attended
    if (registration.status !== "registered") {
      return res.status(400).json({ message: "Cannot mark attendance for non-active registration." });
    }

    // Check payment approval for merchandise events
    if (event.type === "merchandise" && registration.paymentStatus !== "approved") {
      return res.status(400).json({ message: "Cannot mark attendance for non-approved payment." });
    }

    if (registration.attended) {
      return res.status(400).json({ message: "Attendance already recorded for this ticket." });
    }

    registration.attended = true;
    await registration.save();

    event.attendanceCount = (event.attendanceCount || 0) + 1;
    await event.save();

    res.status(200).json({ message: "Attendance marked.", registration });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// participent routes 

// GET /api/events
// Public — returns published, ongoing, completed, and closed events
export const getPublishedEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: { $in: ["published", "ongoing", "completed", "closed"] }
    })
      .populate("organizer", "firstName lastName email")
      .sort({ startDate: 1 });

    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/events/:eventId
// Public — single event detail
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate(
      "organizer",
      "firstName lastName email"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Public can only access active/completed events.
    // Organizer owner and admins can access any state.
    const publicStates = ["published", "ongoing", "completed", "closed"];
    if (!publicStates.includes(event.status)) {
      const authUser = getOptionalAuthUser(req);
      const isAdmin = authUser?.role === "admin";
      const isOwnerOrganizer =
        authUser?.role === "organizer" &&
        event.organizer &&
        event.organizer._id.toString() === authUser.userId;

      if (!isAdmin && !isOwnerOrganizer) {
        return res.status(404).json({ message: "Event not found." });
      }
    }

    res.status(200).json({ event });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// POST /api/events/:eventId/register
// Protected: verifyToken, authorizeRoles("participant")
export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    // Event must exist
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Event must be published
    if (event.status !== "published") {
      return res.status(400).json({ message: "Event is not open for registration." });
    }

    // Registration deadline must not have passed
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: "Registration deadline has passed." });
    }

    // Validate customFields if present on event
    if (event.customFields && event.customFields.length > 0) {
      const responses = req.body && req.body.formResponses ? req.body.formResponses : {};
      if (!responses || typeof responses !== "object") {
        return res.status(400).json({ message: "Form responses required for this event." });
      }

      // Ensure required fields present and non-empty
      for (const field of event.customFields) {
        if (field.required) {
          const val = responses[field.label];
          if (
            val === undefined ||
            val === null ||
            (typeof val === "string" && val.trim() === "")
          ) {
            return res.status(400).json({ message: `Missing required field: ${field.label}` });
          }
        }
      }
    }

    // Normal event: check registration cap
    if (event.type === "normal") {
      if (event.registrationLimit) {
        const count = await Registration.countDocuments({
          event: event._id,
          status: "registered",
        });
        if (count >= event.registrationLimit) {
          return res.status(400).json({ message: "Event is fully booked." });
        }
      }

      // Normal events: one registration per user, period
      const alreadyRegistered = await Registration.findOne({
        user: req.user.userId,
        event: event._id,
        status: "registered",
      });
      if (alreadyRegistered) {
        return res.status(400).json({ message: "You are already registered for this event." });
      }
    } else if (event.type === "merchandise") {
      // Merchandise: allow multiple purchases up to purchaseLimitPerUser

      const merchandiseVariant = req.body.merchandiseVariant;

      // Check if variants are defined for the event and if a variant was selected
      if (event.merchandiseVariants && event.merchandiseVariants.length > 0) {
        if (!merchandiseVariant) {
          return res.status(400).json({ message: "A size/variant must be selected." });
        }
        const targetVariant = event.merchandiseVariants.find(v => v.name === merchandiseVariant);
        if (!targetVariant) {
          return res.status(400).json({ message: "Invalid merchandise variant selected." });
        }
        if (targetVariant.stock <= 0) {
          return res.status(400).json({ message: `The variant "${merchandiseVariant}" is out of stock.` });
        }
      } else {
        // If no variants are defined, check overall stockQuantity
        if (event.stockQuantity <= 0) {
          return res.status(400).json({ message: "This item is out of stock." });
        }
      }

      // Count active purchases by this user
      const userPurchaseCount = await Registration.countDocuments({
        user: req.user.userId,
        event: event._id,
        status: "registered",
        paymentStatus: { $in: ["pending", "approved"] },
      });

      if (userPurchaseCount >= event.purchaseLimitPerUser) {
        return res.status(400).json({
          message: `Purchase limit of ${event.purchaseLimitPerUser} reached for this item.`,
        });
      }
    }

    // Create registration (generate ticket and QR)
    const ticketId = uuidv4();
    const registrationPayload = {
      user: req.user.userId,
      event: event._id,
      ticketId,
      status: "registered",
    };

    // Set payment status: pending for merchandise, approved for normal events
    if (event.type === "merchandise") {
      registrationPayload.paymentStatus = "pending";
      // Store payment proof if provided
      if (req.body && req.body.paymentProof) {
        registrationPayload.paymentProof = req.body.paymentProof; // base64 or URL
      }

      // Store variant if selected and valid
      if (req.body && req.body.merchandiseVariant) {
        const merchandiseVariant = req.body.merchandiseVariant;
        if (event.merchandiseVariants && event.merchandiseVariants.length > 0) {
          const targetVariant = event.merchandiseVariants.find(v => v.name === merchandiseVariant);
          if (targetVariant) {
            registrationPayload.merchandiseVariant = merchandiseVariant;
          } else {
            return res.status(400).json({ message: "Invalid merchandise variant selected." });
          }
        } else {
          // If event has no variants defined, but user sent one, it's invalid
          return res.status(400).json({ message: "This merchandise does not have variants." });
        }
      } else if (event.merchandiseVariants && event.merchandiseVariants.length > 0) {
        return res.status(400).json({ message: "A size/variant must be selected." });
      }
    }

    // If client submitted form responses for custom fields, store them
    if (req.body && req.body.formResponses) {
      registrationPayload.formResponses = req.body.formResponses;
    }

    const registration = await Registration.create(registrationPayload);

    // Deduct stock permanently from the global and variant quantities
    if (event.type === "merchandise") {
      event.stockQuantity -= 1;
      if (registrationPayload.merchandiseVariant && event.merchandiseVariants) {
        const targetVariant = event.merchandiseVariants.find(v => v.name === registrationPayload.merchandiseVariant);
        if (targetVariant) {
          targetVariant.stock -= 1;
        }
      }
      await event.save();
    }

    // generate QR only for normal events or approved merchandise
    // Merchandise QR generated on approval
    if (event.type === "normal") {
      try {
        const qrPayload = JSON.stringify({ ticketId, eventId: event._id, userId: req.user.userId });
        const qrDataUrl = await QRCode.toDataURL(qrPayload);
        registration.qrCode = qrDataUrl;
        await registration.save();
      } catch (qrErr) {
        console.error("QR generation failed:", qrErr.message);
      }
    }

    res.status(201).json({
      message: "Successfully registered for the event.",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/events/my-registrations
// Protected: verifyToken, authorizeRoles("participant")
export const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user.userId,
    }).populate("event", "name description startDate endDate status type");

    res.status(200).json({ registrations });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// DELETE /api/events/:eventId/cancel
// Protected: verifyToken, authorizeRoles("participant")
export const cancelRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      user: req.user.userId,
      event: req.params.eventId,
      status: "registered",
    });

    if (!registration) {
      return res.status(404).json({ message: "Active registration not found." });
    }

    registration.status = "cancelled";
    await registration.save();

    //stock restore 
    const event = await Event.findById(req.params.eventId);
    if (
      event &&
      event.type === "merchandise" &&
      (registration.paymentStatus === "approved" || registration.paymentStatus === "pending")
    ) {
      event.stockQuantity += 1;
      if (registration.merchandiseVariant && event.merchandiseVariants) {
        const targetVariant = event.merchandiseVariants.find(v => v.name === registration.merchandiseVariant);
        if (targetVariant) {
          targetVariant.stock += 1;
        }
      }
      await event.save();
    }

    res.status(200).json({ message: "Registration cancelled successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/events/:eventId/registrations/:registrationId/payment
// Protected: verifyToken, authorizeRoles("organizer")
// Approve or reject merchandise registration payment
export const approveRejectPayment = async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { status } = req.body;

    // Validate payment status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid payment status. Use 'approved' or 'rejected'." });
    }

    // Ensure organizer owns the event
    const event = await Event.findOne({ _id: eventId, organizer: req.user.userId });
    if (!event) {
      return res.status(404).json({ message: "Event not found or access denied." });
    }

    // Enforce merchandise-only payment workflow
    if (event.type !== "merchandise") {
      return res.status(400).json({ message: "Payment workflow only applies to merchandise events." });
    }

    // Find registration
    const registration = await Registration.findById(registrationId);
    if (!registration || registration.event.toString() !== eventId) {
      return res.status(404).json({ message: "Registration not found." });
    }

    // Only update if currently pending
    if (registration.paymentStatus !== "pending") {
      return res.status(400).json({ message: `Cannot change payment status from "${registration.paymentStatus}".` });
    }

    // If rejecting, release slot and increase stock
    if (status === "rejected") {
      registration.paymentStatus = status;
      await registration.save();

      event.stockQuantity += 1;
      if (registration.merchandiseVariant && event.merchandiseVariants) {
        const targetVariant = event.merchandiseVariants.find(v => v.name === registration.merchandiseVariant);
        if (targetVariant) {
          targetVariant.stock += 1;
        }
      }
      await event.save();

      return res.status(200).json({
        message: "Payment rejected.",
        registration,
      });
    }

    // If approving, generate QR, decrement stock, and send email
    if (status === "approved") {
      if (event.stockQuantity <= 0) {
        return res.status(400).json({ message: "Insufficient stock to approve payment." });
      }

      // Generate QR code for approved transaction
      try {
        const qrPayload = JSON.stringify({
          ticketId: registration.ticketId,
          eventId: event._id,
          userId: registration.user,
        });
        const qrDataUrl = await QRCode.toDataURL(qrPayload);
        registration.qrCode = qrDataUrl;
      } catch (qrErr) {
        console.error("QR generation failed:", qrErr.message);
      }

      // Stock was already decremented during registration. We just issue QR.

      // Mark as approved
      registration.paymentStatus = status;
      await registration.save();

      // Send confirmation email (can be implemented with nodemailer)
      const user = await registration.populate("user", "email firstName");
      sendConfirmationEmail(user.user.email, user.user.firstName, event.name, registration.ticketId)
        .catch((err) => console.error("Email send failed:", err.message));

      return res.status(200).json({
        message: "Payment approved. QR generated and confirmation email sent.",
        registration,
      });
    }

    registration.paymentStatus = status;
    await registration.save();

    res.status(200).json({
      message: `Payment ${status}.`,
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// Helper: Send confirmation email (mock implementation)
const sendConfirmationEmail = async (email, name, eventName, ticketId) => {
  // In production, replace with nodemailer or SendGrid
  console.log(`Email sent to ${email}: Payment approved for ${eventName}, Ticket: ${ticketId}`);
  // Example with nodemailer (requires setup):
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({
  //   to: email,
  //   subject: `Payment Approved - ${eventName}`,
  //   html: `<p>Hi ${name},</p><p>Your payment has been approved!</p>`
  // });
};

// POST /api/events/:eventId/qr-scan
// Protected: verifyToken, authorizeRoles("organizer")
// Process QR scan for attendance
export const processQRScan = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { qrData, manualOverride, overrideNote } = req.body;

    // Organizer owns this event
    const event = await Event.findOne({
      _id: eventId,
      organizer: req.user.userId,
    });
    if (!event) return res.status(404).json({ message: "Event not found or access denied." });

    // Parse QR data (typically JSON with ticketId)
    let ticketId;
    try {
      const parsed = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
      ticketId = parsed.ticketId;
    } catch (e) {
      // Try as plain ticketId
      ticketId = qrData;
    }

    if (!ticketId) {
      return res.status(400).json({ message: "Invalid QR code or ticket ID." });
    }

    const registration = await Registration.findOne({ ticketId, event: eventId });
    if (!registration) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Check payment status for merchandise
    if (event.type === "merchandise" && registration.paymentStatus !== "approved") {
      registration.auditLog.push({
        action: "rejected_duplicate",
        note: "Non-approved payment",
      });
      await registration.save();
      return res
        .status(400)
        .json({ message: "Cannot scan ticket with non-approved payment." });
    }

    // If manual override, allow bypassing attended check
    if (!manualOverride && registration.attended) {
      registration.auditLog.push({
        action: "rejected_duplicate",
        note: "Already scanned",
      });
      await registration.save();
      return res.status(400).json({ message: "Ticket already scanned." });
    }

    // Mark as attended
    registration.attended = true;
    registration.attendedAt = new Date();
    registration.auditLog.push({
      action: manualOverride ? "manual_override" : "scanned",
      note: overrideNote || null,
    });
    await registration.save();

    event.attendanceCount = (event.attendanceCount || 0) + 1;
    await event.save();

    res.status(200).json({
      message: "Attendance marked via QR scan.",
      registration,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/events/:eventId/attendance-dashboard
// Protected: verifyToken, authorizeRoles("organizer")
// Live attendance dashboard: scanned vs not scanned
export const getAttendanceDashboard = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({
      _id: eventId,
      organizer: req.user.userId,
    });
    if (!event) return res.status(404).json({ message: "Event not found or access denied." });

    const registrations = await Registration.find({ event: eventId }).populate(
      "user",
      "firstName lastName email"
    );

    const scanned = registrations.filter((r) => r.attended);
    const notScanned = registrations.filter((r) => !r.attended);

    res.status(200).json({
      event: { name: event.name, status: event.status },
      summary: {
        total: registrations.length,
        scanned: scanned.length,
        notScanned: notScanned.length,
        percentage: registrations.length > 0
          ? ((scanned.length / registrations.length) * 100).toFixed(2)
          : 0,
      },
      scannedList: scanned.map((r) => ({
        ticketId: r.ticketId,
        user: r.user,
        attendedAt: r.attendedAt,
      })),
      notScannedList: notScanned.map((r) => ({
        ticketId: r.ticketId,
        user: r.user,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/events/:eventId/attendance-export
// Protected: verifyToken, authorizeRoles("organizer")
// Export attendance as CSV
export const exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({
      _id: eventId,
      organizer: req.user.userId,
    });
    if (!event) return res.status(404).json({ message: "Event not found or access denied." });

    const registrations = await Registration.find({ event: eventId }).populate(
      "user",
      "firstName lastName email"
    );

    // Build CSV
    let csv = "Ticket ID,First Name,Last Name,Email,Attended,Attended At,Audit Log\n";

    registrations.forEach((r) => {
      const auditLog = r.auditLog
        .map((log) => `${log.action}(${log.timestamp.toISOString()})`)
        .join("; ");

      csv += `"${r.ticketId}","${r.user.firstName}","${r.user.lastName}","${r.user.email}",${r.attended},"${r.attendedAt || ""}","${auditLog}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${eventId}_${Date.now()}.csv`
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
