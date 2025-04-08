var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
require("dotenv").config();
const mongoose = require('mongoose');

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var lessonsRouter = require("./routes/lessons");
var markRouter = require("./routes/mark");
var adminRouter = require('./routes/admin');
var publicRouter = require('./routes/public');
var statsRouter = require('./routes/stats');
var attendancesRouter = require('./routes/attendances');
var teacherRouter = require('./routes/teacher');

var app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB підключено"))
  .catch((err) => console.error("Помилка підключення до MongoDB:", err));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/mark", markRouter);
app.use('/api/admin', adminRouter);
app.use('/api/public', publicRouter); // публічні дані
app.use('/api/stats', statsRouter);
app.use('/api/lessons', attendancesRouter); 
app.use('/api/teacher', teacherRouter);




app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
