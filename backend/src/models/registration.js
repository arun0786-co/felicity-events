import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    ticketId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["registered", "cancelled"],
      default: "registered",
    },
    // QR code image (data URL) for issued ticket and optional form responses
    qrCode: { type: String },
    formResponses: { type: mongoose.Schema.Types.Mixed },
    attended: { type: Boolean, default: false },
    attendedAt: { type: Date }, // timestamp when marked attended
    paymentStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    // Payment proof for merchandise transactions
    paymentProof: {
      type: String, // URL or base64 of uploaded image
    },
    // Captured variant (size/color) for merchandise
    merchandiseVariant: { type: String },
    // Audit trail for attendance actions
    auditLog: [
      {
        action: String, // "scanned", "manual_override", "rejected_duplicate"
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Registration", registrationSchema);