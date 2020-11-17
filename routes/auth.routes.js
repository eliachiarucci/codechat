const { Router } = require("express");
const router = new Router();

// User model
const User = require("../models/User.model.js");

// Bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const { mainModule } = require("process");
const bcryptSalt = 10;

/*******************************************************************************************************************
 *                                                   SIGN UP                                                       *
 *********************************************************************************************************************/
//GET route ==> to display the signup form to users.
router.get("/signup", (req, res, next) => res.render("auth/signup"));

//POST route ==> to process form data
router.post("/signup", (req, res, next) => {
  const { firstname, lastname, email, password, confirmpassword } = req.body;

  // 1. Check username and password are not empty
  if (!firstname || !lastname || !email || !password || !confirmpassword) {
    res.render("auth/signup", {
      firstname,
      lastname,
      email,
      confirmpassword,
      errorMessage: "All fields are mandatory. Please fill the all blanks",
    });
    return;
  }

  User.findOne({ email })
    .then((results) => {
      // 2. Check user does not already exist
      if (results !== null) {
        res.render("auth/signup", {
          email,
          errorMessage: "This email already exists!",
        });
        return;
      }

      // Strong password pattern
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

      // If its a new user:
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

/*******************************************************************************************************************
 *                                                  LOG IN                                                         *
 *********************************************************************************************************************/

const passport = require("passport");

//GET route ==> to display the login form to users.
router.get("/login", (req, res, next) => res.render("auth/login"));

//POST route ==> to process form data
router.post("/login", (req, res, next) => {
  console.log("USER: ", "theUser");
  passport.authenticate("local", (err, theUser, failureDetails) => {
    console.log("USER: ", theUser);
    if (err) {
      // Something went wrong authenticating user
      return next(err);
    }
    if (!theUser) {
      // Unauthorized, `failureDetails` contains the error messages from our logic in "LocalStrategy" {message: '…'}.
      res.render("auth/login", { errorMessage: "Wrong password or username" });
      return;
    }
    // save user in session: req.user
    req.login(theUser, (err) => {
      if (err) {
        // Session save went bad
        return next(err);
      }
      // All good, we are now logged in and `req.user` is now set
      res.redirect("/feed");
    });
  })(req, res, next);
});

router.get("/login", (req, res, next) => {
  res.render("auth/login", { errorMessage: req.flash("error") }); // !!!
});

//Private page -for only people who have account access this page
router.get("/private-page", (req, res) => {
  if (!req.user) {
    res.redirect("/login"); // can't access the page, so go and log in
    return;
  }

  // ok, req.email is defined
  res.render("private", { email: req.email });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true, // !!!
  })
);

/*router.post("/login", (req, res, next) => {
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
        res.redirect("/");
      } else {
        res.render("auth/login", {
          email,
          errorMessage: "Incorrect password",
        });
      }
    })
    .catch((error) => next(error));
});
*/

router.get("/feed", (req, res) => {
  console.log(req.user);
  if (!req.user) {
    res.redirect("/");
  } else {
    res.render("home/feed", { user: req.user });
  }
});

router.get("/newpost", (req, res) => {
  if (!req.user) {
    res.redirect("/");
  } else {
    res.render("home/newpost", { user: req.user });
  }
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

module.exports = router;
