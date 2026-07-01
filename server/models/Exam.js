const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    examName: { type: String, required: true },
    examCode: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    source: {
      type: String,
      enum: ["faculty_manual", "anna_university"],
      default: "faculty_manual"
    },
    sourceUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

schema.index({ department: 1, semester: 1, examCode: 1 }, { unique: true });

module.exports = mongoose.model("Exam", schema);
