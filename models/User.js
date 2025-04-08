const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "admin"], required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null }, 
  allowedSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: [] }],
  allowedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: [] }],

});

module.exports = mongoose.model("User", UserSchema);
