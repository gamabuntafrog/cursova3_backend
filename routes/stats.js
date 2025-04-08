const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticateToken } = require("../middleware/auth");

const Lesson = require("../models/Lesson");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

const ObjectId = mongoose.Types.ObjectId;

router.get("/group-subject", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }

    const { groupId, subjectId } = req.query;
    if (!groupId || !subjectId) {
      return res
        .status(400)
        .json({ message: "Потрібно вказати groupId та subjectId" });
    }

    const teacherId = req.user.id;

    // Агрегація для отримання кількості занять та сумарної фактичної відвідуваності
    const lessonsAgg = await Lesson.aggregate([
      {
        $match: {
          teacher: new ObjectId(teacherId),
          subject: new ObjectId(subjectId),
          group: new ObjectId(groupId),
        },
      },
      {
        $lookup: {
          from: "attendances",
          localField: "_id",
          foreignField: "lesson",
          as: "attendances",
        },
      },
      {
        $group: {
          _id: null,
          lessonCount: { $sum: 1 },
          totalActualAttendance: { $sum: { $size: "$attendances" } },
        },
      },
    ]);

    let lessonCount = 0;
    let totalActualAttendance = 0;
    if (lessonsAgg.length > 0) {
      lessonCount = lessonsAgg[0].lessonCount;
      totalActualAttendance = lessonsAgg[0].totalActualAttendance;
    } else {
      return res.json({
        lessonCount: 0,
        studentCount: 0,
        totalActualAttendance: 0,
        maxAttendance: 0,
        attendancePercentage: 0,
      });
    }

    // Підрахунок студентів, що належать до вказаної групи
    const studentCount = await User.countDocuments({
      role: "student",
      group: new ObjectId(groupId),
    });

    // Максимальна кількість відвідувань = кількість занять * кількість студентів
    const maxAttendance = lessonCount * studentCount;

    // Відсоток відвідуваності
    const attendancePercentage =
      maxAttendance > 0
        ? Math.round((totalActualAttendance / maxAttendance) * 10000) / 100
        : 0;

    res.json({
      lessonCount,
      studentCount,
      totalActualAttendance,
      maxAttendance,
      attendancePercentage,
    });
  } catch (error) {
    console.error("Error in /stats/group-subject:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/attendance-detail", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    const { groupId, subjectId } = req.query;
    if (!groupId || !subjectId) {
      return res
        .status(400)
        .json({ message: "Потрібно вказати groupId та subjectId" });
    }
    const teacherId = req.user.id;

    // Отримуємо всі заняття викладача з обраною групою та предметом
    const lessons = await Lesson.find({
      teacher: new ObjectId(teacherId),
      subject: new ObjectId(subjectId),
      group: new ObjectId(groupId),
    }).select("_id");

    if (!lessons.length) {
      return res.json({ totalLessons: 0, studentStats: [] });
    }

    const lessonIds = lessons.map((lesson) => lesson._id);
    const totalLessons = lessons.length;

    // Отримуємо список студентів з обраної групи
    const students = await User.find({
      role: "student",
      group: new ObjectId(groupId),
    }).select("_id name email");

    // Агрегуємо дані відвідувань для знайдених занять по кожному студенту
    const attendanceData = await Attendance.aggregate([
      { $match: { lesson: { $in: lessonIds } } },
      { $group: {
          _id: "$student",
          attendanceCount: { $sum: 1 }
      }}
    ]);
    
    // Створюємо мапу: ключ – ідентифікатор студента, значення – кількість відвідувань
    const attendanceMap = {};
    attendanceData.forEach(item => {
      attendanceMap[item._id.toString()] = item.attendanceCount;
    });

    // Формуємо статистику для кожного студента
    const studentStats = students.map((student) => {
      // Парсимо email для відображеня імені та фамілії студента
      const parsedName = (() => {
            const localPart = student.email.split("@")[0]; // [фамілія].[ім'я]
            const parts = localPart.split(".");
            if (parts.length === 2) {
              // Формуємо "Ім'я Прізвище", де parts[1] — ім'я, parts[0] — фамілія
              const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
              return capitalize(parts[1]) + " " + capitalize(parts[0]);
            }
            return student.email;
          })();

      const attended = attendanceMap[student._id.toString()] || 0;
      const absenceCount = totalLessons - attended;
      const attendancePercentage =
        totalLessons > 0
          ? Math.round((attended / totalLessons) * 10000) / 100
          : 0;
      return {
        studentId: student._id,
        name: parsedName,
        email: student.email,
        attendanceCount: attended,
        absenceCount,
        attendancePercentage,
      };
    });

    res.json({ totalLessons, studentStats });
  } catch (error) {
    console.error("Error in /stats/attendance-detail:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
