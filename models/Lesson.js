const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  title: { type: String },
  createdAt: { type: Date, default: Date.now },
  currentToken: { type: String },
  qrCode: { type: String },
});

module.exports = mongoose.model("Lesson", LessonSchema);
