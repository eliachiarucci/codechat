// routes/auth.routes.js

const { Router } = require('express');
const router = new Router();

// User model
const User = require('../models/User.model.js');

// Bcrypt to encrypt passwords
const bcrypt = require('bcrypt');
const { mainModule } = require('process');
const bcryptSalt = 10;

//GET route ==> to display the signup form to users.
router.get('/signup', (req, res, next) => res.render('auth/signup'));
//POST route ==> to process form data (don't forget to hash the password with bcrypt ;{ )
router.post('/signup', (req, res, next) => {
  const { firstname, lastname, email, password, confirmpassword } = req.body;

  // 1. Check username and password are not empty
  if (!firstname || !lastname || !email || !password || !confirmpassword) {
    res.render("auth/signup", {
      firstname,
      lastname,
      email,
      confirmpassword,
      errorMessage:
        "All fields are mandatory. Please fill the all blanks",
    });
    return;
  }

  User.findOne({ email })
    .then(results => {
      // 2. Check user does not already exist
      if (results !== null) {
        res.render('auth/signup', {
          email,
          errorMessage: 'This email already exists!'
        });
        return;
      }

      // Strong password pattern.
      const strongPasswordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;

      // Validate that incoming password matches regex pattern.
      if (!strongPasswordRegex.test(password)) {
        res.status(500).render("auth/signup", {
          firstname,
          lastname,
          email,
          confirmpassword,
          errorMessage:
            "Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter.",
        });
        return;
      }


      // Encrypt the password
      const salt = bcrypt.genSaltSync(bcryptSalt);
      const hashPass = bcrypt.hashSync(password, salt);

      // If its a new user we need to:
      // Step 1: Hash the incoming password
      // Step 2: Create the new user

      bcrypt
        .hash(password, 10)
        .then((hashedPassword) => {
          const newUser = new User({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            confirmpassword,
          });

          newUser
            .save()
            .then(() => res.redirect("/")) //shoud add main routes 
            .catch((err) => next(err));
        })
        .catch((err) => next(err));
    })
    .catch((err) => next(err));
});

router.get('/login', (req, res, next) => res.render('auth/login'));

router.post("/login", (req, res, next) => {
  console.log("SESSION =====> ", req.session);
  // get the data from login form
  const { email, password } = req.body;

  // Validate that incoming data is not empty.
  if (!email || !password) {
    res.render("auth/login", {
      email,
      errorMessage:
        "All fields are mandatory. Please provide your email and password.",
    });
    return;
  }

  // find email and send correct response
  User.findOne({ email })
    .then((user) => {
      // check if found email was an object or null
      if (!user) {
        res.render("auth/login", {
          email,
          errorMessage: "Email is not registered. Try with other email.",
        });
        return;
      } else if (bcrypt.compareSync(password, user.passwordHash)) {
        //res.render("users/user-profile", { user });

        // Adding user to session so we can have an eye.
        // redirect to the route for the profile
        req.session.user = user;
        res.redirect("/user-profile");
      } else {
        res.render("auth/login", {
          email,
          errorMessage: "Incorrect password",
        });
      }
    })
    .catch((error) => next(error));
});

router.post("/logout", (req, res) => {
  // Alternative 1 for logging out
  req.session.destroy();
  res.redirect("/");

});

module.exports = router;