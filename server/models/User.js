const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "faculty", "student", "representative"], required: true },
    rollNo: { type: String, default: undefined, unique: true, sparse: true },
    staffId: { type: String, default: undefined, unique: true, sparse: true },
    adminId: { type: String, default: undefined, unique: true, sparse: true },
    department: { type: String, default: "" },
    semester: { type: Number, default: 0 },
    password: { type: String, required: true },
    assignedFaculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isRepresentative: { type: Boolean, default: false }
  },
  { timestamps: true }
);

schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

schema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", schema);
