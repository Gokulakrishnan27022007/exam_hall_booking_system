require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./server/config/db");
const authRoutes = require("./server/routes/authRoutes");
const examRoutes = require("./server/routes/examRoutes");
const hallRoutes = require("./server/routes/hallRoutes");
const bookingRoutes = require("./server/routes/bookingRoutes");
const dashboardRoutes = require("./server/routes/dashboardRoutes");
const notificationRoutes = require("./server/routes/notificationRoutes");

const app = express();
connectDB();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/halls", hallRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(express.static(path.join(__dirname, "client")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "client", "index.html")));
app.listen(process.env.PORT || 5000, () => console.log(`Server running on http://localhost:${process.env.PORT || 5000}`));
