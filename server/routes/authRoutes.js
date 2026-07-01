const express = require("express");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { logAction } = require("../services/auditService");
const { protect, allow } = require("../middleware/auth");

const router = express.Router();
const sign = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  role: user.role,
  rollNo: user.rollNo,
  staffId: user.staffId,
  adminId: user.adminId,
  department: user.department,
  semester: user.semester,
  assignedFaculty: user.assignedFaculty,
  isRepresentative: user.isRepresentative
});

router.post("/student-register", asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const rollNo = String(req.body.rollNo || "").trim().toUpperCase();
  const department = String(req.body.department || "").trim();
  const semester = Number(req.body.semester);
  const password = String(req.body.password || "");

  const assignedAdvisor = await User.findOne({
    role: "faculty",
    department
  }).sort({ createdAt: 1 });

  const user = await User.create({
    name,
    rollNo,
    department,
    semester,
    password,
    role: "student",
    assignedFaculty: assignedAdvisor ? assignedAdvisor._id : null
  });
  await logAction(user._id, "REGISTER", "AUTH", { role: "student", rollNo });
  res.status(201).json({
    message: assignedAdvisor
      ? `Student registered and linked to ${assignedAdvisor.name}`
      : "Student registered. No faculty advisor is mapped to this department yet.",
    user: safeUser(user)
  });
}));

router.post("/student-login", asyncHandler(async (req, res) => {
  const { rollNo, password } = req.body;
  const user = await User.findOne({ rollNo });
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: "Invalid login" });
  await logAction(user._id, "LOGIN", "AUTH", { role: user.role });
  res.json({ token: sign(user), user: safeUser(user) });
}));

router.post("/faculty-login", asyncHandler(async (req, res) => {
  const { staffId, password } = req.body;
  const user = await User.findOne({ staffId, role: "faculty" });
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: "Invalid login" });
  await logAction(user._id, "LOGIN", "AUTH", { role: "faculty" });
  res.json({ token: sign(user), user: safeUser(user) });
}));

router.post("/admin-login", asyncHandler(async (req, res) => {
  const { adminId, password } = req.body;
  const user = await User.findOne({ adminId, role: "admin" });
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: "Invalid login" });
  await logAction(user._id, "LOGIN", "AUTH", { role: "admin" });
  res.json({ token: sign(user), user: safeUser(user) });
}));

router.get("/me", protect, asyncHandler(async (req, res) => {
  res.json(safeUser(req.user));
}));

router.patch("/me", protect, asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  if (name) req.user.name = name;
  if (password) req.user.password = password;
  await req.user.save();
  await logAction(req.user._id, "UPDATE_PROFILE", "AUTH", { nameUpdated: Boolean(name), passwordUpdated: Boolean(password) });
  res.json({ message: "Profile updated successfully", user: safeUser(req.user) });
}));

router.get("/faculty-advisors", protect, allow("admin"), asyncHandler(async (_req, res) => {
  const facultyUsers = await User.find({ role: "faculty" }).sort({ department: 1, name: 1 });
  const advisors = await Promise.all(
    facultyUsers.map(async (faculty) => ({
      ...safeUser(faculty),
      assignedStudents: await User.countDocuments({
        assignedFaculty: faculty._id,
        role: { $in: ["student", "representative"] }
      })
    }))
  );

  const departments = await User.distinct("department", {
    role: { $in: ["student", "representative", "faculty"] },
    department: { $nin: [null, ""] }
  });

  res.json({
    advisors,
    departments: departments.sort()
  });
}));

router.post("/faculty-advisors", protect, allow("admin"), asyncHandler(async (req, res) => {
  const payload = {
    name: String(req.body.name || "").trim(),
    staffId: String(req.body.staffId || "").trim().toUpperCase(),
    department: String(req.body.department || "").trim(),
    password: String(req.body.password || "")
  };

  if (!payload.name || !payload.staffId || !payload.department || !payload.password) {
    return res.status(400).json({ message: "Name, staff ID, department, and password are required" });
  }

  const exists = await User.findOne({ staffId: payload.staffId });
  if (exists) {
    return res.status(400).json({ message: "A user with this staff ID already exists" });
  }

  const faculty = await User.create({
    ...payload,
    role: "faculty"
  });

  await logAction(req.user._id, "CREATE_FACULTY_ADVISOR", "USER", {
    facultyId: faculty._id,
    department: faculty.department
  });

  res.status(201).json({
    message: "Faculty advisor created successfully",
    advisor: safeUser(faculty)
  });
}));

router.patch("/faculty-advisors/:id/assign-department", protect, allow("admin"), asyncHandler(async (req, res) => {
  const department = String(req.body.department || "").trim();
  if (!department) {
    return res.status(400).json({ message: "Department is required" });
  }

  const faculty = await User.findOne({ _id: req.params.id, role: "faculty" });
  if (!faculty) {
    return res.status(404).json({ message: "Faculty advisor not found" });
  }

  faculty.department = department;
  await faculty.save();

  const updateResult = await User.updateMany(
    {
      department,
      role: { $in: ["student", "representative"] }
    },
    {
      assignedFaculty: faculty._id
    }
  );

  await logAction(req.user._id, "ASSIGN_FACULTY_ADVISOR", "USER", {
    facultyId: faculty._id,
    department,
    mappedUsers: updateResult.modifiedCount
  });

  res.json({
    message: `Faculty advisor assigned to ${department}. ${updateResult.modifiedCount} student record(s) updated.`,
    advisor: safeUser(faculty),
    updatedStudents: updateResult.modifiedCount
  });
}));

module.exports = router;
