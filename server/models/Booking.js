const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: "Hall", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    facultyAdvisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: String, required: true },
    semester: { type: Number, required: true },
    examDate: { type: String, required: true },
    slot: { type: String, required: true },
    seatsRequested: { type: Number, required: true },
    seatsAllocatedStart: { type: Number, default: 0 },
    seatsAllocatedEnd: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending_faculty", "faculty_approved", "faculty_rejected", "admin_confirmed", "admin_rejected"],
      default: "pending_faculty"
    },
    facultyRemarks: { type: String, default: "" },
    adminRemarks: { type: String, default: "" },
    facultyDecisionAt: { type: Date, default: null },
    adminDecisionAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", schema);
