const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Exam = require("../models/Exam");
const Hall = require("../models/Hall");
const Booking = require("../models/Booking");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/me", protect, asyncHandler(async (req, res) => {
  const payload = {
    role: req.user.role,
    name: req.user.name,
    department: req.user.department,
    semester: req.user.semester
  };
  payload.notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8);

  if (req.user.role === "admin") {
    payload.totalUsers = await User.countDocuments();
    payload.totalHalls = await Hall.countDocuments();
    payload.totalExams = await Exam.countDocuments();
    payload.pendingAdmin = await Booking.countDocuments({ status: "faculty_approved" });
    payload.recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(12);
  }
  if (req.user.role === "faculty") {
    payload.totalMyExams = await Exam.countDocuments({ createdBy: req.user._id });
    payload.pendingFaculty = await Booking.countDocuments({ facultyAdvisor: req.user._id, status: "pending_faculty" });
    payload.representatives = await User.find({ assignedFaculty: req.user._id, isRepresentative: true }).select("-password");
    payload.myExams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  }
  if (req.user.role === "representative") {
    payload.myBookings = await Booking.find({ requestedBy: req.user._id }).populate("exam hall").sort({ createdAt: -1 });
    payload.availableExams = await Exam.find({ department: req.user.department, semester: req.user.semester });
  }
  if (req.user.role === "student") {
    payload.upcomingExams = await Booking.find({
      department: req.user.department,
      semester: req.user.semester,
      status: "admin_confirmed"
    }).populate("exam hall").sort({ examDate: 1 });
  }
  res.json(payload);
}));

module.exports = router;
