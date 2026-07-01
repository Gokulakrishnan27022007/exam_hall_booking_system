require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Hall = require("../models/Hall");

(async () => {
  await connectDB();
  await User.deleteMany({});
  await Hall.deleteMany({});

  const facultyCSE = await User.create({
    name: "Faculty Advisor CSE",
    role: "faculty",
    staffId: "FAC001",
    department: "CSE",
    password: "Pass@123"
  });

  const facultyIT = await User.create({
    name: "Faculty Advisor IT",
    role: "faculty",
    staffId: "FAC002",
    department: "IT",
    password: "Pass@123"
  });

  const facultyMSCIT = await User.create({
    name: "Faculty Advisor MSC IT",
    role: "faculty",
    staffId: "FAC003",
    department: "M.Sc Information Technology (Integrated)",
    password: "Pass@123"
  });

  const facultyMSCCS = await User.create({
    name: "Faculty Advisor MSC CS",
    role: "faculty",
    staffId: "FAC004",
    department: "M.Sc Computer Science (Integrated)",
    password: "Pass@123"
  });

  await User.create({
    name: "System Admin",
    role: "admin",
    adminId: "ADMIN001",
    password: "Pass@123"
  });

  await User.create({
    name: "Student One",
    role: "student",
    rollNo: "22CSE001",
    department: "CSE",
    semester: 6,
    password: "Pass@123",
    assignedFaculty: facultyCSE._id
  });

  await User.create({
    name: "Student Two",
    role: "student",
    rollNo: "22IT001",
    department: "IT",
    semester: 6,
    password: "Pass@123",
    assignedFaculty: facultyIT._id
  });

  await User.create({
    name: "Integrated IT Student",
    role: "student",
    rollNo: "22MSCIT001",
    department: "M.Sc Information Technology (Integrated)",
    semester: 8,
    password: "Pass@123",
    assignedFaculty: facultyMSCIT._id
  });

  await User.create({
    name: "Integrated CS Student",
    role: "student",
    rollNo: "22MSCCS001",
    department: "M.Sc Computer Science (Integrated)",
    semester: 8,
    password: "Pass@123",
    assignedFaculty: facultyMSCCS._id
  });

  await Hall.create([
    { hallName: "Hall A", capacity: 60, location: "Block 1" },
    { hallName: "Hall B", capacity: 80, location: "Block 2" }
  ]);

  console.log("Seed completed");
  await mongoose.connection.close();
})();
