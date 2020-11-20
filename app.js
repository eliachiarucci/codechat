require("dotenv").config();

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const express = require("express");
const favicon = require("serve-favicon");
const hbs = require("hbs");
const mongoose = require("mongoose");
const logger = require("morgan");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("./models/User.model.js");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");
const { format } = require("date-fns");
//for Google account
var GoogleStrategy = require("passport-google-oauth20").Strategy;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then((x) => {
    console.log(
      `Connected to Mongo! Database name: "${x.connections[0].name}"`
    );
  })
  .catch((err) => {
    console.error("Error connecting to mongo", err);
  });

const app_name = require("./package.json").name;
const debug = require("debug")(
  `${app_name}:${path.basename(__filename).split(".")[0]}`
);

const app = express();

// Middleware Setup
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Middleware for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
    resave: true,
    saveUninitialized: false, // <== false if you don't want to save empty session object to the store
  })
);

// Passport LocalStrategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // by default
      passwordField: "password", // by default
    },
    (email, password, done) => {
      User.findOne({ email })
        .then((user) => {
          if (!user) {
            return done(null, false, { message: "Incorrect e-mail" });
          }

          if (!bcrypt.compareSync(password, user.password)) {
            return done(null, false, { message: "Incorrect password" });
          }

          done(null, user);
        })
        .catch((err) => done(err));
    }
  )
);

app.use(flash());

//for Google Account

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      const email = profile._json.email;
      User.find({ email: email })
        .then((currentUser) => {
          if (currentUser.length !== 0) {
            done(null, currentUser);
          } else {
            const { given_name, family_name, picture } = profile._json;
            return User.create({
              firstname: given_name,
              lastname: family_name,
              email,
              imageUrl: picture,
            })
              .then((newUser) => {
                done(null, newUser);
              })
              .catch((err) => console.error(err));
          }
        })
        .catch((err) => console.error(err));
    }
  )
);

// Express View engine setup
app.use(
  require("node-sass-middleware")({
    src: path.join(__dirname, "public"),
    dest: path.join(__dirname, "public"),
    sourceMap: true,
  })
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(path.join(__dirname, "public", "images", "favicon.ico")));
app.use(function (req, res, next) {
  app.locals.user = req.user;
  next();
});

// Passport serialize
passport.serializeUser((user, cb) => cb(null, user));

// Passport deserialize
passport.deserializeUser((id, cb) => {
  User.findById(id)
    .then((user) => cb(null, user))
    .catch((err) => cb(err));
});

hbs.registerPartials("views/partials");
hbs.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});
hbs.registerHelper("formatDate", function (date) {
  return format(date, "dd-MM-yyyy");
});
hbs.registerHelper("object", function ({ hash }) {
  return hash;
});

// default value for title local
app.locals.title = "Express - Generated with IronGenerator";
app.use(passport.initialize());
app.use(passport.session());
const main = require("./routes/main.routes");
app.use("/", main);

const auth = require("./routes/auth.routes");
app.use("/", auth);

const user = require("./routes/user.routes");
app.use("/", user);

module.exports = app;
