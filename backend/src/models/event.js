import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["normal", "merchandise"],
      required: true,
    },
    venue: { type: String },
    eligibility: { type: String },
    registrationDeadline: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    registrationLimit: { type: Number },
    // seats taken in a normal event. registration reserves a seat with one
    // conditional $inc, so concurrent requests cannot pass the limit
    registeredCount: { type: Number, default: 0 },
    registrationFee: { type: Number },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "closed"],
      default: "draft",
    },

    // Merchandise-specific fields
    stockQuantity: {
      type: Number,
      default: 0,
    },
    purchaseLimitPerUser: {
      type: Number,
      default: 1,
    },
    merchandiseVariants: [
      {
        name: { type: String, required: true },
        stock: { type: Number, required: true, default: 0 }
      }
    ],

    // Custom fields schema for dynamic registration forms
    customFields: [
      {
        label: { type: String },
        fieldType: { type: String }, // e.g., text, number, select
        required: { type: Boolean, default: false },
        options: [{ type: String }],
      },
    ],

    // Analytics support
    attendanceCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);