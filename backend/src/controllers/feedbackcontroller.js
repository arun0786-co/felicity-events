import Feedback from "../models/feedback.js";
import Event from "../models/event.js";
import Registration from "../models/registration.js";

// POST /api/feedback/:eventId
// Protected: participant
export const submitFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, comment, isAnonymous } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    if (event.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Feedback allowed only after event completion." });
    }

    // Must be registered
    const registration = await Registration.findOne({
      event: eventId,
      user: req.user.userId,
      status: "registered",
    });

    if (!registration) {
      return res.status(403).json({ message: "You did not attend this event." });
    }

    // Prevent duplicate feedback
    const existing = await Feedback.findOne({
      event: eventId,
      user: req.user.userId,
    });

    if (existing) {
      return res.status(400).json({ message: "Feedback already submitted." });
    }

    const feedback = await Feedback.create({
      event: eventId,
      user: req.user.userId,
      rating,
      comment,
      isAnonymous: isAnonymous ?? true,
    });

    res.status(201).json({
      message: "Feedback submitted successfully.",
      feedback,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/feedback/:eventId
// Protected: organizer
export const getEventFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { minRating, maxRating } = req.query; // Filter by rating range

    const event = await Event.findOne({
      _id: eventId,
      organizer: req.user.userId,
    });

    if (!event) {
      return res
        .status(404)
        .json({ message: "Event not found or access denied." });
    }

    // Build rating filter query
    let ratingFilter = {};
    if (minRating) ratingFilter.$gte = parseInt(minRating);
    if (maxRating) ratingFilter.$lte = parseInt(maxRating);

    const query = { event: eventId };
    if (Object.keys(ratingFilter).length > 0) {
      query.rating = ratingFilter;
    }

    const feedbacks = await Feedback.find(query)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    // Hide user details if anonymous
    const sanitized = feedbacks.map((fb) => {
      if (fb.isAnonymous) {
        return {
          _id: fb._id,
          rating: fb.rating,
          comment: fb.comment,
          createdAt: fb.createdAt,
          isAnonymous: true,
        };
      }
      return fb;
    });

    // Calculate average rating
    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((a, b) => a + (b.rating || 0), 0) / feedbacks.length
        : 0;

    res.status(200).json({
      feedback: sanitized,
      summary: {
        totalFeedback: feedbacks.length,
        averageRating: parseFloat(avgRating.toFixed(2)),
        filters: {
          minRating: minRating || "any",
          maxRating: maxRating || "any",
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export default { submitFeedback, getEventFeedback };
