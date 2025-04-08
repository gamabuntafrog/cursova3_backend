const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
