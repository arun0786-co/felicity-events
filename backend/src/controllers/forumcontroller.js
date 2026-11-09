import Message from "../models/message.js";
import Event from "../models/event.js";
import Registration from "../models/registration.js";

// POST /api/forum/:eventId/messages
// Protected: participant (registered for event)
export const postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, parentMessage } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Content cannot be empty." });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    // Verify user is registered for this event (any role)
    const registration = await Registration.findOne({
      event: eventId,
      user: req.user.userId,
      status: "registered",
    });

    if (!registration && req.user.role !== "organizer") {
      return res
        .status(403)
        .json({ message: "Only registered participants can post." });
    }

    if (req.user.role === "organizer") {
      if (event.organizer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Only the respective event organizer can post here." });
      }
    } else if (!registration) {
      return res.status(403).json({ message: "Only registered participants can post." });
    }

    // Validate parent message if threading
    if (parentMessage) {
      const parent = await Message.findOne({
        _id: parentMessage,
        event: eventId,
      });
      if (!parent) {
        return res.status(404).json({ message: "Parent message not found." });
      }
    }

    const message = await Message.create({
      event: eventId,
      author: req.user.userId,
      content,
      parentMessage: parentMessage || null,
      isAnnouncement: false,
    });

    await message.populate("author", "firstName lastName role");

    res.status(201).json({
      message: "Message posted successfully.",
      data: message,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/forum/:eventId/messages
// Public - returns all messages for event (threaded)
export const getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { parentId } = req.query; // null = main thread, otherwise thread replies

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    // Fetch main messages (pinned first, then by date)
    const query = {
      event: eventId,
      parentMessage: parentId ? parentId : null,
    };

    const messages = await Message.find(query)
      .populate("author", "firstName lastName role email")
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// GET /api/forum/:eventId/messages/:messageId/replies
// Get threaded replies for a message
export const getMessageReplies = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;

    const parent = await Message.findOne({
      _id: messageId,
      event: eventId,
      parentMessage: null,
    });

    if (!parent) {
      return res.status(404).json({ message: "Message not found." });
    }

    const replies = await Message.find({
      event: eventId,
      parentMessage: messageId,
    })
      .populate("author", "firstName lastName role email")
      .sort({ createdAt: 1 });

    res.status(200).json({ replies });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// DELETE /api/forum/:eventId/messages/:messageId
// Protected: author or organizer
export const deleteMessage = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      event: eventId,
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Check authorization
    if (
      message.author.toString() !== req.user.userId &&
      req.user.role !== "organizer"
    ) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages." });
    }

    await Message.deleteOne({ _id: messageId });

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PATCH /api/forum/:eventId/messages/:messageId/pin
// Protected: organizer
export const pinMessage = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const { isPinned } = req.body;

    const event = await Event.findOne({
      _id: eventId,
      organizer: req.user.userId,
    });

    if (!event) {
      return res
        .status(404)
        .json({ message: "Event not found or access denied." });
    }

    const message = await Message.findOne({
      _id: messageId,
      event: eventId,
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    message.isPinned = isPinned ?? !message.isPinned;
    await message.save();

    res.status(200).json({
      message: `Message ${message.isPinned ? "pinned" : "unpinned"}.`,
      data: message,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// POST /api/forum/:eventId/messages/:messageId/announcement
// Protected: organizer
export const postAnnouncement = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Content cannot be empty." });
    }

    const event = await Event.findOne({
      _id: eventId,
      organizer: req.user.userId,
    });

    if (!event) {
      return res
        .status(404)
        .json({ message: "Event not found or access denied." });
    }

    const message = await Message.create({
      event: eventId,
      author: req.user.userId,
      content,
      isAnnouncement: true,
      isPinned: true,
    });

    await message.populate("author", "firstName lastName role");

    res.status(201).json({
      message: "Announcement posted successfully.",
      data: message,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// POST /api/forum/:eventId/messages/:messageId/react
// Protected: participant
export const reactToMessage = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji required." });
    }

    const message = await Message.findOne({
      _id: messageId,
      event: eventId,
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Verify user is registered for this event (unless role is respective organizer)
    if (req.user.role === "organizer") {
      if (message.event.toString() !== eventId) {
        // Just paranoia check
      }
      const event = await Event.findById(eventId);
      if (event && event.organizer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Only the event organizer or registered participants can react." });
      }
    } else {
      const registration = await Registration.findOne({
        event: eventId,
        user: req.user.userId,
        status: "registered",
      });
      if (!registration) {
        return res
          .status(403)
          .json({ message: "Only registered participants can react to messages." });
      }
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.userReactions.find(
      (r) => r.user.toString() === req.user.userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.userReactions = message.userReactions.filter(
        (r) => !(r.user.toString() === req.user.userId && r.emoji === emoji)
      );
      message.reactions.set(emoji, (message.reactions.get(emoji) || 1) - 1);
      if (message.reactions.get(emoji) <= 0) {
        message.reactions.delete(emoji);
      }
    } else {
      // Add reaction
      message.userReactions.push({
        user: req.user.userId,
        emoji,
      });
      message.reactions.set(emoji, (message.reactions.get(emoji) || 0) + 1);
    }

    await message.save();

    res.status(200).json({
      message: "Reaction updated.",
      data: message,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export default {
  postMessage,
  getMessages,
  getMessageReplies,
  deleteMessage,
  pinMessage,
  postAnnouncement,
  reactToMessage,
};
