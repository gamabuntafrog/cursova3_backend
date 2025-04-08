const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const User = require("../models/User");
const Lesson = require("../models/Lesson");

// Ендпоїнт для отримання дозволених предметів
router.get("/allowed-subjects", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    const teacher = await User.findById(req.user.id).populate(
      "allowedSubjects"
    );
    if (!teacher) {
      return res.status(404).json({ message: "Викладача не знайдено" });
    }
    res.json(teacher.allowedSubjects);
  } catch (error) {
    console.error("Error fetching allowed subjects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Ендпоїнт для отримання дозволених груп
router.get("/allowed-groups", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    const teacher = await User.findById(req.user.id).populate("allowedGroups");
    if (!teacher) {
      return res.status(404).json({ message: "Викладача не знайдено" });
    }
    res.json(teacher.allowedGroups);
  } catch (error) {
    console.error("Error fetching allowed groups:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = router;
