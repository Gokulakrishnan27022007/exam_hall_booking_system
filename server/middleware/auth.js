const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Token missing" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

exports.allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
  next();
};
