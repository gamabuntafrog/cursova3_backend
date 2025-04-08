var express = require("express");
var router = express.Router();
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { authenticateToken } = require("../middleware/auth");
const Group = require("../models/Group");
const Subject = require("../models/Subject");
const User = require("../models/User");
const { default: mongoose } = require("mongoose");

// Middleware для перевірки ролі адміністратора
function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Доступ заборонено" });
  }
  next();
}


// GET /api/admin/teachers/search?q=... — пошук викладачів за email (нечутливий до регістру)
router.get('/teachers/search/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const query = { role: 'teacher', _id: new mongoose.Types.ObjectId(req.params.id)};
    const teacher = await User.findOne(query).select('_id email allowedSubjects allowedGroups');

    res.json(teacher);
  } catch (error) {
    console.error("Error searching teachers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/admin/teachers/search?q=... — пошук викладачів за email (нечутливий до регістру)
router.get('/teachers/search', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    const query = q ? { email: { $regex: q, $options: 'i' }, role: 'teacher' } : { role: 'teacher' };
    const teachers = await User.find(query).select('_id email allowedSubjects allowedGroups');
    res.json(teachers);
  } catch (error) {
    console.error("Error searching teachers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.put('/teachers/:teacherId/assign', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const { allowedSubjects, allowedGroups } = req.body;
    
    const teacher = await User.findOneAndUpdate(
      { _id: teacherId, role: 'teacher' },
      { allowedSubjects, allowedGroups },
      { new: true }
    );
    if (!teacher) {
      return res.status(404).json({ message: "Викладача не знайдено" });
    }
    res.json({ message: "Доступ надано успішно", teacher });
  } catch (error) {
    console.error("Error assigning access:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// --- Робота з групами ---

// GET /api/admin/groups — перелік усіх груп
router.get("/groups", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const groups = await Group.find({});
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

// POST /api/admin/groups/create — створення нової групи
router.post(
  "/groups/create",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name)
        return res.status(400).json({ message: "Вкажіть назву групи" });
      const newGroup = new Group({ name });
      await newGroup.save();
      res.json({ message: "Група створена", group: newGroup });
    } catch (error) {
      res.status(500).json({ message: "Внутрішня помилка сервера" });
    }
  }
);

// DELETE /api/admin/groups/:id — видалення групи
router.delete(
  "/groups/:id",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const group = await Group.findByIdAndDelete(req.params.id);
      if (!group) return res.status(404).json({ message: "Групу не знайдено" });
      res.json({ message: "Групу видалено" });
    } catch (error) {
      res.status(500).json({ message: "Внутрішня помилка сервера" });
    }
  }
);

// --- Робота з предметами ---

// GET /api/admin/subjects — перелік усіх предметів
router.get("/subjects", authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const subjects = await Subject.find({});
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

// POST /api/admin/subjects/create — створення нового предмета
router.post(
  "/subjects/create",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name)
        return res.status(400).json({ message: "Вкажіть назву предмета" });
      const newSubject = new Subject({ name });
      await newSubject.save();
      res.json({ message: "Предмет створено", subject: newSubject });
    } catch (error) {
      res.status(500).json({ message: "Внутрішня помилка сервера" });
    }
  }
);

// DELETE /api/admin/subjects/:id — видалення предмета
router.delete(
  "/subjects/:id",
  authenticateToken,
  isAdmin,
  async (req, res, next) => {
    try {
      const subject = await Subject.findByIdAndDelete(req.params.id);
      if (!subject)
        return res.status(404).json({ message: "Предмет не знайдено" });
      res.json({ message: "Предмет видалено" });
    } catch (error) {
      res.status(500).json({ message: "Внутрішня помилка сервера" });
    }
  }
);


/**
 * POST /api/admin/teachers/create
 * Створює нового викладача за введеним email.
 * Генерує випадковий пароль (8 символів у hex форматі) і зберігає викладача з роллю "teacher".
 * Повертає email і згенерований пароль.
 */
router.post('/teachers/create', require('../middleware/auth').authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email є обов'язковим" });
    }
    
    // Перевіряємо, чи існує користувач з таким email
    const existingTeacher = await User.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: "Користувач з таким email вже існує" });
    }
    
    // Генеруємо випадковий пароль (8 hex символів)
    const rawPassword = crypto.randomBytes(4).toString('hex');
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    
    // Створюємо нового викладача
    const teacher = new User({
      email,
      password: hashedPassword,
      role: 'teacher'
    });
    await teacher.save();
    
    res.json({ 
      message: "Викладача створено успішно", 
      teacher: { email: teacher.email, password: rawPassword }
    });
  } catch (error) {
    console.error("Помилка створення викладача:", error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

module.exports = router;
