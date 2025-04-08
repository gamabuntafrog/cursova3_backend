const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');

const Attendance = require('../models/Attendance');
const User = require('../models/User');

router.get('/:lessonId/attendances', authenticateToken, async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const attendances = await Attendance.find({ lesson: new mongoose.Types.ObjectId(lessonId) })
      .populate({ path: 'student', select: 'email name' })
      .sort({ time: 1 });
    
    // Парсинг імені студента з email
    const parsedAttendances = attendances.map(att => {
      let studentName = att.student.name;
      if (!studentName) {
        const localPart = att.student.email.split('@')[0];
        const parts = localPart.split('.');
        const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
        studentName = (parts.length === 2)
          ? `${capitalize(parts[1])} ${capitalize(parts[0])}`
          : att.student.email;
      }
      return {
        studentId: att.student._id,
        name: studentName,
        time: att.time
      };
    });
    
    res.json(parsedAttendances);
  } catch (error) {
    console.error("Error fetching attendances:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
