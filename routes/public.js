var express = require('express');
var router = express.Router();
const Group = require('../models/Group');
const Subject = require('../models/Subject');

// GET /api/public/groups — перелік усіх груп (для викладачів та студентів)
router.get('/groups', async (req, res, next) => {
  try {
    const groups = await Group.find({});
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

// GET /api/public/subjects — перелік усіх предметів (для викладачів та студентів)
router.get('/subjects', async (req, res, next) => {
  try {
    const subjects = await Subject.find({});
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Внутрішня помилка сервера" });
  }
});

module.exports = router;
