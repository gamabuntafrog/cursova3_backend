var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var QRCode = require('qrcode');
var Lesson = require('../models/Lesson');
var Attendance = require('../models/Attendance');
var User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async function (req, res, next) {
  try {
    const { id: lessonId, token } = req.query;
    if (!req.user) {
      return res.redirect(`/login?redirect=/mark?id=${lessonId}&token=${token}`);
    }
    const studentId = req.user.id;

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) return res.status(400).send('Цей код недійсний або застарів.');

      // Перевірка, чи студент вже відмічений
      const existingAttendance = await Attendance.findOne({ lesson: lessonId, student: studentId });
      if (existingAttendance) {
        return res.send('Ти вже відмічений.');
      }

      // Фіксація присутності
      const attendance = new Attendance({
        lesson: lessonId,
        student: studentId,
        time: new Date()
      });
      await attendance.save();

      // Отримуємо дані студента для передачі в подію
      const student = await User.findById(req.user.id);
      let studentName = student.name;
      if (!studentName) {
        const parts = student.email.split('@')[0].split('.');
        studentName = (parts.length === 2) 
          ? (parts[1].charAt(0).toUpperCase() + parts[1].slice(1)) + ' ' + (parts[0].charAt(0).toUpperCase() + parts[0].slice(1))
          : student.email;
      }

      // Генеруємо новий короткоживучий токен та QR код
      const newToken = jwt.sign({ lessonId }, JWT_SECRET, { expiresIn: '30s' });
      const newMarkUrl = `${BASE_URL}/mark?id=${lessonId}&token=${newToken}`;
      const newQrCode = await QRCode.toDataURL(newMarkUrl);

      // Оновлюємо заняття з новим токеном та QR кодом
      await Lesson.findByIdAndUpdate(lessonId, { currentToken: newToken, qrCode: newQrCode });

      // Отримуємо доступ до socket.io через app.locals
      const io = req.app.locals.io;
      // Емитимо подію з інформацією про студента
      io.to(`lesson_${lessonId}`).emit('studentMarked', { 
        student: { id: student._id, name: studentName, time: new Date() } 
      });
      // Емитимо подію з оновленням QR коду
      io.to(`lesson_${lessonId}`).emit('qrUpdated', { newToken, newQrCode });

      res.send('Відмітка присутності успішно виконана.');
    });
  } catch (error) {
    console.error('Помилка відмітки присутності:', error);
    res.status(500).send('Внутрішня помилка сервера.');
  }
});

module.exports = router;
