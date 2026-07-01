const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: String,
    module: String,
    details: Object
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", schema);
