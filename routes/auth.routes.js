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

module.exports = router;