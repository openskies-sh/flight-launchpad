require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const layout = require("express-layout");
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("express-flash");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'views')));

const middlewares = [
    layout(),
    express.static(path.join(__dirname, "public")),
    bodyParser.urlencoded({ extended: true }),
    cookieParser(),
    session({
      secret: "super-secret-key",
      key: "super-secret-cookie",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 60000 }
    }),
    flash()
  ];
  app.use(middlewares);
  
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.set("views", path.join(__dirname, "public"));
app.set("view engine", "ejs");

app.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!");
  });
  
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });
  
module.exports = app;
