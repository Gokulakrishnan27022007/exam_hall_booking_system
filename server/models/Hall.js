const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    hallName: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true },
    location: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hall", schema);
