const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const Exam = require("../models/Exam");
const User = require("../models/User");
const { protect, allow } = require("../middleware/auth");
const { logAction } = require("../services/auditService");
const annaCatalog = require("../data/annaUniversityCatalog.json");

const router = express.Router();

router.post("/", protect, allow("faculty"), asyncHandler(async (req, res) => {
  const payload = {
    examName: String(req.body.examName || "").trim(),
    examCode: String(req.body.examCode || "").trim().toUpperCase(),
    department: req.user.department,
    semester: Number(req.body.semester),
    createdBy: req.user._id,
    source: req.body.source === "anna_university" ? "anna_university" : "faculty_manual",
    sourceUrl: req.body.sourceUrl || ""
  };

  if (!payload.examName || !payload.examCode || !payload.semester) {
    return res.status(400).json({ message: "Exam name, code, and semester are required" });
  }

  const existing = await Exam.findOne({
    department: payload.department,
    semester: payload.semester,
    examCode: payload.examCode
  });

  if (existing) {
    return res.json({
      message: "Exam already exists for this department and semester",
      exam: existing,
      exists: true
    });
  }

  const exam = await Exam.create(payload);
  await logAction(req.user._id, "CREATE_EXAM", "EXAM", {
    examId: exam._id,
    source: exam.source
  });
  res.status(201).json({ message: "Exam created successfully", exam });
}));

router.get("/", protect, asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === "faculty") query = { createdBy: req.user._id };
  if (req.user.role === "student" || req.user.role === "representative") query = { department: req.user.department, semester: req.user.semester };
  const exams = await Exam.find(query).sort({ semester: 1, examCode: 1 });
  res.json(exams);
}));

router.get("/catalog", protect, asyncHandler(async (req, res) => {
  let department = req.query.department;
  let semester = req.query.semester ? Number(req.query.semester) : null;

  if (["faculty", "student", "representative"].includes(req.user.role)) {
    department = req.user.department;
  }

  if (["student", "representative"].includes(req.user.role) && !semester) {
    semester = req.user.semester;
  }

  const catalogEntry = annaCatalog[department];
  if (!catalogEntry) {
    return res.json({
      department,
      semester,
      supported: false,
      regulation: "",
      sourceUrl: "",
      availableSemesters: [],
      subjects: []
    });
  }

  const availableSemesters = Object.keys(catalogEntry.semesters)
    .map(Number)
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);

  const subjects = semester ? (catalogEntry.semesters[String(semester)] || []) : [];

  res.json({
    department,
    semester,
    supported: true,
    regulation: catalogEntry.regulation,
    sourceUrl: catalogEntry.sourceUrl,
    availableSemesters,
    subjects
  });
}));

router.get("/students", protect, allow("faculty", "admin"), asyncHandler(async (req, res) => {
  const query = {
    role: { $in: ["student", "representative"] }
  };

  if (req.user.role === "faculty") query.department = req.user.department;
  if (req.user.role === "admin" && req.query.department) query.department = req.query.department;
  if (req.query.semester) query.semester = Number(req.query.semester);

  const students = await User.find(query)
    .select("name rollNo department semester role isRepresentative assignedFaculty")
    .sort({ rollNo: 1 });

  res.json(students);
}));

router.get("/departments", protect, allow("faculty", "admin"), asyncHandler(async (_req, res) => {
  const dbDepartments = await User.distinct("department", {
    role: { $in: ["student", "representative"] },
    department: { $nin: [null, ""] }
  });
  const officialDepartments = Object.keys(annaCatalog);
  const departments = [...new Set([...dbDepartments, ...officialDepartments])].sort();
  res.json(departments);
}));

router.post("/assign-representative", protect, allow("faculty"), asyncHandler(async (req, res) => {
  const student = await User.findOne({
    rollNo: req.body.rollNo,
    department: req.user.department,
    semester: Number(req.body.semester)
  });
  if (!student) return res.status(404).json({ message: "Student not found" });
  student.role = "representative";
  student.isRepresentative = true;
  student.assignedFaculty = req.user._id;
  await student.save();
  await logAction(req.user._id, "ASSIGN_REPRESENTATIVE", "USER", { rollNo: student.rollNo });
  res.json({ message: "Representative assigned successfully", student });
}));

module.exports = router;
