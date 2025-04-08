var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");
const Group = require("../models/Group");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const SALT_ROUNDS = 10;

// Ендпоїнт для оновлення токена
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    // req.user встановлюється middleware authenticateToken
    const user = req.user;

    // Створюємо новий токен
    const newToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token: newToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /users/register — Реєстрація користувача
router.post("/register", async function (req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password ) {
      return res.status(400).json({ message: "Заповніть всі поля" });
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Користувач з таким email вже існує" });
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = new User({
      email,
      password: hashedPassword,
      role: 'student',
    });
    
    await newUser.save();
    res.json({ message: "Реєстрація успішна" });
  } catch (error) {
    console.error("Помилка реєстрації:", error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

// POST /users/login — Вхід користувача
router.post("/login", async function (req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(401).json({ message: "Невірні дані" });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Невірні дані" });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    let group = "";

    if (user.group) {
      group = await Group.findOne(user.group);
    }

    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, group, allowedSubjects: user.allowedSubjects, allowedGroups: user.allowedGroups },
    });
  } catch (error) {
    console.error("Помилка входу:", error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

// PUT /users/update-group — оновлення групи для студента
router.put("/update-group", authenticateToken, async function (req, res, next) {
  try {
    // Переконуємося, що зміна може здійснюватися лише для студентів
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ message: "Вкажіть groupId" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { group: groupId },
      { new: true }
    );

    const group = await Group.findOne(updatedUser.group);

    updatedUser.group = group;

    res.json({ message: "Групу оновлено", user: updatedUser });
  } catch (error) {
    console.error("Помилка оновлення групи:", error);
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

module.exports = router;
