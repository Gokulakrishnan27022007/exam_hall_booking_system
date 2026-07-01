const express = require("express");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", protect, asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
}));

router.patch("/:id/read", protect, asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  res.json(item);
}));

module.exports = router;
