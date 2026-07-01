const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const Hall = require("../models/Hall");
const Booking = require("../models/Booking");
const { protect, allow } = require("../middleware/auth");
const { logAction } = require("../services/auditService");

const router = express.Router();
const ALLOWED_SLOTS = [
  "08:30-10:00",
  "10:30-12:00",
  "13:30-15:00",
  "15:30-17:00"
];

router.post("/", protect, allow("admin"), asyncHandler(async (req, res) => {
  const hall = await Hall.create({
    hallName: req.body.hallName,
    capacity: Number(req.body.capacity),
    location: req.body.location
  });
  await logAction(req.user._id, "CREATE_HALL", "HALL", { hallId: hall._id });
  res.status(201).json(hall);
}));

router.patch("/:id", protect, allow("admin"), asyncHandler(async (req, res) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) return res.status(404).json({ message: "Hall not found" });

  hall.hallName = String(req.body.hallName || hall.hallName).trim();
  hall.capacity = Number(req.body.capacity || hall.capacity);
  hall.location = String(req.body.location || hall.location).trim();
  await hall.save();

  await logAction(req.user._id, "UPDATE_HALL", "HALL", { hallId: hall._id });
  res.json({ message: "Hall updated successfully", hall });
}));

router.get("/", protect, asyncHandler(async (_req, res) => {
  const halls = await Hall.find().sort({ hallName: 1 });
  res.json(halls);
}));

router.get("/availability", protect, asyncHandler(async (req, res) => {
  const { examDate, slot } = req.query;
  if (!examDate || !slot) return res.status(400).json({ message: "Date and slot are required" });
  if (!ALLOWED_SLOTS.includes(slot)) return res.status(400).json({ message: "Invalid exam slot" });
  const halls = await Hall.find().sort({ hallName: 1 });
  const bookings = await Booking.find({
    examDate,
    slot,
    status: { $in: ["faculty_approved", "admin_confirmed"] }
  });
  const result = halls.map((hall) => {
    const used = bookings.filter((b) => String(b.hall) === String(hall._id)).reduce((sum, item) => sum + item.seatsRequested, 0);
    return { _id: hall._id, hallName: hall.hallName, capacity: hall.capacity, location: hall.location, seatsUsed: used, seatsLeft: hall.capacity - used };
  });
  res.json(result);
}));

module.exports = router;
