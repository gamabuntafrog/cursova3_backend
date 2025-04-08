var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
var QRCode = require("qrcode");
var Lesson = require("../models/Lesson"); 
var Attendance = require("../models/Attendance");
require("dotenv").config();
const { authenticateToken } = require("../middleware/auth");
const Subject = require("../models/Subject");
const { default: mongoose } = require("mongoose");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

router.post('/create', authenticateToken, async function(req, res, next) {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    const teacherId = req.user.id;
    const { subjectId, lessonTitle, groupId } = req.body;
    if (!subjectId || !lessonTitle || !groupId) {
      return res.status(400).json({ message: "Вкажіть subjectId, lessonTitle та groupId" });
    }

    const lesson = new Lesson({
      teacher: teacherId,
      subject: subjectId,
      title: lessonTitle,
      group: groupId,
      createdAt: new Date(),
    });
    await lesson.save();

    const shortLivedToken = jwt.sign({ lessonId: lesson._id }, JWT_SECRET, { expiresIn: '30m' });
    const markUrl = `http://localhost:5173/mark?id=${lesson._id}&token=${shortLivedToken}`;
    const qrCodeDataURL = await QRCode.toDataURL(markUrl);

    console.log(markUrl);

    lesson.currentToken = shortLivedToken;
    lesson.qrCode = qrCodeDataURL;
    await lesson.save();

    res.json({ lessonId: lesson._id, qrCode: qrCodeDataURL });
  } catch (error) {
    console.error('Помилка створення заняття:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
});


router.get("/teacher/last7", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }

    const teacherId = req.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Знаходимо заняття викладача, створені за останні 7 днів, відсортовані за датою (від нових до старих)
    const lessons = await Lesson.find({
      teacher: new mongoose.Types.ObjectId(teacherId),
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: -1 });

    res.json(lessons);
  } catch (error) {
    console.error("Error fetching last 7 days lessons:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/teacher", authenticateToken, async function (req, res, next) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    const teacherId = req.user.id;
    const lessons = await Lesson.find({ teacher: teacherId }).sort({
      createdAt: -1,
    });

    function formatDate(date) {
      return date.toISOString().split("T")[0];
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    // Групування занять за датою
    const grouped = {};
    lessons.forEach((lesson) => {
      const lessonDate = formatDate(lesson.createdAt);
      let group = lessonDate;
      if (lessonDate === todayStr) {
        group = "Сьогодні";
      } else if (lessonDate === yesterdayStr) {
        group = "Вчора";
      }
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(lesson);
    });

    res.json(grouped);
  } catch (error) {
    console.error("Помилка отримання занять викладача:", error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

// GET /api/lessons/:lessonId — для отримання даних заняття
router.get("/:lessonId", authenticateToken, async function (req, res, next) {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson)
      return res.status(404).json({ message: "Заняття не знайдено" });

    const subject = await Subject.findById(lesson.subject)
  
    res.json({...lesson.toObject(), subject: subject.name});
  } catch (error) {
    console.error("Помилка отримання заняття:", error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

module.exports = router;
