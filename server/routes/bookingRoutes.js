const express = require("express");
const PDFDocument = require("pdfkit");
const asyncHandler = require("../utils/asyncHandler");
const Booking = require("../models/Booking");
const Hall = require("../models/Hall");
const Exam = require("../models/Exam");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect, allow } = require("../middleware/auth");
const { logAction } = require("../services/auditService");
const { createStudentReminders } = require("../services/reminderService");

const router = express.Router();
const ALLOWED_SLOTS = [
  "08:30-10:00",
  "10:30-12:00",
  "13:30-15:00",
  "15:30-17:00"
];
const ACTIVE_CLASS_BOOKING_STATUSES = [
  "pending_faculty",
  "faculty_approved",
  "admin_confirmed"
];

function escapeCsv(value) {
  const output = String(value ?? "");
  if (output.includes(",") || output.includes('"') || output.includes("\n")) {
    return `"${output.replace(/"/g, '""')}"`;
  }
  return output;
}

function formatTime12Hour(value) {
  if (!value || !String(value).includes(":")) return value || "";
  const [hourText, minuteText] = String(value).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatSlotLabel(slot) {
  if (!slot || !String(slot).includes("-")) return slot || "";
  const [start, end] = String(slot).split("-");
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
}

function formatDateTimeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

async function getSeatsLeft(hallId, examDate, slot) {
  const hall = await Hall.findById(hallId);
  const confirmed = await Booking.find({
    hall: hallId,
    examDate,
    slot,
    status: { $in: ["faculty_approved", "admin_confirmed"] }
  });
  const used = confirmed.reduce((sum, b) => sum + b.seatsRequested, 0);
  return { hall, used, left: hall.capacity - used };
}

async function findClassConflict({ department, semester, examDate, slot, excludeBookingId = null }) {
  const query = {
    department,
    semester: Number(semester),
    examDate,
    slot,
    status: { $in: ACTIVE_CLASS_BOOKING_STATUSES }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query).populate("exam hall");
}

router.post("/", protect, allow("representative"), asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.body.exam);
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  if (!ALLOWED_SLOTS.includes(req.body.slot)) {
    return res.status(400).json({ message: "Please choose a valid exam slot" });
  }
  if (exam.department !== req.user.department || Number(exam.semester) !== Number(req.user.semester)) {
    return res.status(400).json({ message: "This exam does not belong to your department and semester" });
  }
  const facultyAdvisor = await User.findById(req.user.assignedFaculty);
  if (!facultyAdvisor) return res.status(400).json({ message: "Faculty advisor not assigned" });

  const classConflict = await findClassConflict({
    department: req.user.department,
    semester: req.user.semester,
    examDate: req.body.examDate,
    slot: req.body.slot
  });

  if (classConflict) {
    return res.status(400).json({
      message: `This class already has ${classConflict.exam?.examName || "an exam"} booked on ${req.body.examDate} during ${req.body.slot} in ${classConflict.hall?.hallName || "another hall"}`
    });
  }

  const stats = await getSeatsLeft(req.body.hall, req.body.examDate, req.body.slot);
  if (Number(req.body.seatsRequested) > stats.left) return res.status(400).json({ message: `Only ${stats.left} seats available in this hall` });

  const booking = await Booking.create({
    exam: req.body.exam,
    hall: req.body.hall,
    requestedBy: req.user._id,
    facultyAdvisor: facultyAdvisor._id,
    department: req.user.department,
    semester: req.user.semester,
    examDate: req.body.examDate,
    slot: req.body.slot,
    seatsRequested: Number(req.body.seatsRequested)
  });

  await Notification.create({
    user: facultyAdvisor._id,
    title: "Booking needs approval",
    message: `${req.user.name} submitted a hall booking request`
  });

  await logAction(req.user._id, "CREATE_BOOKING", "BOOKING", { bookingId: booking._id });
  res.status(201).json(booking);
}));

router.get("/", protect, asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === "representative") query = { requestedBy: req.user._id };
  if (req.user.role === "faculty") query = { facultyAdvisor: req.user._id };
  if (req.user.role === "student") query = { department: req.user.department, semester: req.user.semester, status: "admin_confirmed" };
  const bookings = await Booking.find(query).populate("exam hall requestedBy facultyAdvisor").sort({ createdAt: -1 });
  res.json(bookings);
}));

router.get("/export", protect, allow("admin"), asyncHandler(async (req, res) => {
  const bookings = await Booking.find({})
    .populate("exam hall requestedBy facultyAdvisor")
    .sort({ examDate: 1, slot: 1, createdAt: -1 });

  const headers = [
    "Exam Code",
    "Exam Name",
    "Department",
    "Semester",
    "Exam Date",
    "Exam Slot",
    "Hall Name",
    "Hall Location",
    "Seats Requested",
    "Seat Range",
    "Representative",
    "Faculty Advisor",
    "Status",
    "Requested At",
    "Faculty Reviewed At",
    "Admin Reviewed At",
    "Faculty Remarks",
    "Admin Remarks"
  ];

  const rows = bookings.map((booking) => [
    booking.exam?.examCode || "",
    booking.exam?.examName || "",
    booking.department || "",
    booking.semester || "",
    booking.examDate || "",
    formatSlotLabel(booking.slot),
    booking.hall?.hallName || "",
    booking.hall?.location || "",
    booking.seatsRequested || 0,
    booking.seatsAllocatedStart && booking.seatsAllocatedEnd
      ? `${booking.seatsAllocatedStart}-${booking.seatsAllocatedEnd}`
      : "",
    booking.requestedBy?.name || "",
    booking.facultyAdvisor?.name || "",
    booking.status || "",
    formatDateTimeLabel(booking.createdAt),
    formatDateTimeLabel(booking.facultyDecisionAt),
    formatDateTimeLabel(booking.adminDecisionAt),
    booking.facultyRemarks || "",
    booking.adminRemarks || ""
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(","))
  ].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="booking-data-${stamp}.csv"`);
  res.send(csv);
}));

router.get("/export-pdf", protect, allow("admin"), asyncHandler(async (req, res) => {
  const bookings = await Booking.find({})
    .populate("exam hall requestedBy facultyAdvisor")
    .sort({ examDate: 1, slot: 1, createdAt: -1 });

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="booking-data-${stamp}.pdf"`);

  const doc = new PDFDocument({
    size: "A4",
    margin: 40
  });

  doc.pipe(res);
  doc.fontSize(18).font("Helvetica-Bold").text("Exam Hall Booking Report", {
    align: "center"
  });
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor("#475569").text(
    `Generated on ${formatDateTimeLabel(new Date())}`,
    { align: "center" }
  );
  doc.fillColor("#111827");
  doc.moveDown(1);

  if (!bookings.length) {
    doc.fontSize(12).text("No booking data available.");
    doc.end();
    return;
  }

  bookings.forEach((booking, index) => {
    if (doc.y > 700) {
      doc.addPage();
    }

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${index + 1}. ${booking.exam?.examCode || "-"} - ${booking.exam?.examName || "Booking"}`);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Department: ${booking.department || "-"}    Semester: ${booking.semester || "-"}`);
    doc.text(`Exam Date: ${booking.examDate || "-"}    Slot: ${formatSlotLabel(booking.slot)}`);
    doc.text(`Hall: ${booking.hall?.hallName || "-"}    Location: ${booking.hall?.location || "-"}`);
    doc.text(`Seats Requested: ${booking.seatsRequested || 0}    Seat Range: ${booking.seatsAllocatedStart && booking.seatsAllocatedEnd ? `${booking.seatsAllocatedStart}-${booking.seatsAllocatedEnd}` : "-"}`);
    doc.text(`Representative: ${booking.requestedBy?.name || "-"}    Faculty Advisor: ${booking.facultyAdvisor?.name || "-"}`);
    doc.text(`Status: ${booking.status || "-"}`);
    doc.text(`Requested At: ${formatDateTimeLabel(booking.createdAt) || "-"}`);
    doc.text(`Faculty Reviewed At: ${formatDateTimeLabel(booking.facultyDecisionAt) || "-"}`);
    doc.text(`Admin Reviewed At: ${formatDateTimeLabel(booking.adminDecisionAt) || "-"}`);
    if (booking.facultyRemarks) {
      doc.text(`Faculty Remarks: ${booking.facultyRemarks}`);
    }
    if (booking.adminRemarks) {
      doc.text(`Admin Remarks: ${booking.adminRemarks}`);
    }
    doc.moveDown(0.5);
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.8);
  });

  doc.end();
}));

router.patch("/:id/faculty-review", protect, allow("faculty"), asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (String(booking.facultyAdvisor) !== String(req.user._id)) return res.status(403).json({ message: "Unauthorized" });

  if (req.body.approve) {
    const classConflict = await findClassConflict({
      department: booking.department,
      semester: booking.semester,
      examDate: booking.examDate,
      slot: booking.slot,
      excludeBookingId: booking._id
    });

    if (classConflict) {
      return res.status(400).json({
        message: `This class already has ${classConflict.exam?.examName || "another exam"} approved or pending on ${booking.examDate} during ${booking.slot}`
      });
    }
  }

  booking.status = req.body.approve ? "faculty_approved" : "faculty_rejected";
  booking.facultyRemarks = req.body.remarks || "";
  booking.facultyDecisionAt = new Date();
  await booking.save();
  await Notification.create({
    user: booking.requestedBy,
    title: req.body.approve ? "Faculty approved booking" : "Faculty rejected booking",
    message: booking.facultyRemarks || "Faculty review completed"
  });
  await logAction(req.user._id, "FACULTY_REVIEW", "BOOKING", { bookingId: booking._id, status: booking.status });
  res.json(booking);
}));

router.patch("/:id/admin-confirm", protect, allow("admin"), asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("exam hall requestedBy");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status !== "faculty_approved") return res.status(400).json({ message: "Faculty approval required first" });

  if (!req.body.confirm) {
    booking.status = "admin_rejected";
    booking.adminRemarks = req.body.remarks || "";
    booking.adminDecisionAt = new Date();
    await booking.save();
    return res.json(booking);
  }

  const classConflict = await findClassConflict({
    department: booking.department,
    semester: booking.semester,
    examDate: booking.examDate,
    slot: booking.slot,
    excludeBookingId: booking._id
  });

  if (classConflict) {
    return res.status(400).json({
      message: `This class already has ${classConflict.exam?.examName || "another exam"} scheduled on ${booking.examDate} during ${booking.slot}`
    });
  }

  const stats = await getSeatsLeft(booking.hall._id, booking.examDate, booking.slot);
  if (booking.seatsRequested > stats.left) return res.status(400).json({ message: `Only ${stats.left} seats available now` });

  booking.status = "admin_confirmed";
  booking.adminRemarks = req.body.remarks || "";
  booking.adminDecisionAt = new Date();
  booking.seatsAllocatedStart = stats.used + 1;
  booking.seatsAllocatedEnd = stats.used + booking.seatsRequested;
  await booking.save();

  await Notification.create({
    user: booking.requestedBy._id,
    title: "Admin confirmed booking",
    message: `Booking confirmed for ${booking.exam.examName}. Seats ${booking.seatsAllocatedStart}-${booking.seatsAllocatedEnd}`
  });

  const students = await User.find({
    department: booking.department,
    semester: booking.semester,
    role: { $in: ["student", "representative"] }
  });

  for (const student of students) await createStudentReminders(student);
  await logAction(req.user._id, "ADMIN_CONFIRM", "BOOKING", { bookingId: booking._id });
  res.json(booking);
}));

router.get("/student-schedule/me", protect, allow("student", "representative"), asyncHandler(async (req, res) => {
  await createStudentReminders(req.user);
  const schedule = await Booking.find({
    department: req.user.department,
    semester: req.user.semester,
    status: "admin_confirmed"
  }).populate("exam hall").sort({ examDate: 1 });
  res.json(schedule);
}));

module.exports = router;
