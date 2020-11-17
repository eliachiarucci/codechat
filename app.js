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
const User = require("./models/User.model");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");

//for Google account
var GoogleStrategy = require('passport-google-oauth20').Strategy;

mongoose
  .connect(
    "mongodb+srv://elia:codechat@cluster0.mdps2.mongodb.net/codechat?retryWrites=true&w=majority",
    { useNewUrlParser: true, 
      useUnifiedTopology: true,
      useCreateIndex: true
     }
  )
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

app.use(passport.initialize());
app.use(passport.session());

// Passport serialize
passport.serializeUser((user, cb) => cb(null, user._id));

// Passport deserialize
passport.deserializeUser((id, cb) => {
  User.findById(id)
    .then((user) => cb(null, user))
    .catch((err) => cb(err));
});

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

passport.use(new GoogleStrategy({
  clientID: '983568792623-99315tdls9o7uk3tr42klmf31v786065.apps.googleusercontent.com',
  clientSecret: 'anWXv2HWemRERTGV4nLccgUH',
  callbackURL: "http://localhost:3000/auth/google/callback"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


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

hbs.registerPartials("views/partials");

// default value for title local
app.locals.title = "Express - Generated with IronGenerator";

const main = require("./routes/main.routes");
app.use("/", main);

const auth = require("./routes/auth.routes");
app.use("/", auth);

const router = require("./routes/auth.routes");
app.use("/", router);

//Log In with Google Account 


module.exports = app;
