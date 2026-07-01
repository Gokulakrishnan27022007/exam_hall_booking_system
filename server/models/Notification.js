const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: String,
    message: String,
    tag: String,
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", schema);
