import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["participant", "organizer", "admin"],
      required: true,
    },
    participantType: {
      type: String,
      enum: ["IIIT", "NON_IIIT"],
    },
    college: { type: String },
    contactNumber: { type: String },
    isActive: { type: Boolean, default: true },
    // Organizer specific fields
    category: { type: String },
    description: { type: String },
    discordWebhook: { type: String },

    // Participant preferences for onboarding and profile
    interests: [{ type: String }],
    followedOrganizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
