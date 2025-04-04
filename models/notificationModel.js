const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: { type: String, required: true, minlength: 1 },
    isRead: { type: Boolean, default: false },
    type: { type: String, required: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1 }, { expireAfterSeconds: 259200 });

exports.Notification = mongoose.model("Notification", notificationSchema);
