const Notification = require("../models/Notification");
const Booking = require("../models/Booking");

exports.createStudentReminders = async (student) => {
  const bookings = await Booking.find({
    department: student.department,
    semester: student.semester,
    status: "admin_confirmed"
  }).populate("exam hall");

  const today = new Date();
  for (const booking of bookings) {
    const examDate = new Date(booking.examDate);
    const diff = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    if (![7, 1].includes(diff)) continue;
    const tag = `${student._id}-${booking._id}-${diff}`;
    const exists = await Notification.findOne({ tag });
    if (exists) continue;
    await Notification.create({
      user: student._id,
      title: diff === 7 ? "Exam reminder: 1 week left" : "Exam reminder: tomorrow",
      message: `${booking.exam.examName} (${booking.exam.examCode}) is on ${booking.examDate} in ${booking.hall.hallName}`,
      tag
    });
  }
};
