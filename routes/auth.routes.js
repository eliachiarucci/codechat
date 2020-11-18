const { Router } = require("express");
const router = new Router();
const { format } = require("date-fns");
// User model
const User = require("../models/User.model.js");

// Post model
const Post = require("../models/Post.model");

// Bcrypt to encrypt passwords
const bcrypt = require("bcrypt");
const { mainModule } = require("process");
const bcryptSalt = 10;

/*********************************************************************************************************************
 *                                                   SIGN UP                                                         *
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
            .then(() => res.redirect("/feed")) //shoud add main routes
            .catch((err) => next(err));
        })
        .catch((err) => next(err));
    })
    .catch((err) => next(err));
});

/*********************************************************************************************************************
 *                                                  LOG IN                                                           *
 *********************************************************************************************************************/

const passport = require("passport");
const { populate } = require("../models/User.model.js");

//GET route ==> to display the login form to users.
router.get("/login", (req, res, next) => res.render("auth/login"));

//POST route ==> to process form data
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;
  console.log("USER: ", "theUser");
  if (!email || !password) {
    res.render("auth/login", {
      email,
      errorMessage: "All fields are mandatory. Please fill the all blanks",
    });
    return;
  }

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

router.get("/feed", (req, res) => {
  console.log(req.user);
  if (!req.user) {
    res.redirect("/");
  } else {
    Post.find()
      .populate("author")
      .then((posts) => {
        res.render("home/feed", {
          user: req.user,
          posts,
        });
      })
      .catch((err) => res.send("There has been an error"));
  }
});

router.get("/newpost", (req, res) => {
  if (!req.user) {
    res.redirect("/");
  } else {
    res.render("home/newpost", { user: req.user });
  }
});

router.post("/newpost", (req, res) => {
  let { id } = req.user;
  const { text, html, css, js } = req.body;
  console.log(id);

  Post.create({ text, html, css, js, author: id })
    .then(
      (newpost) => console.log(newpost),
      res.send("new post created succesfully!")
    )
    .carch((err) => console.error(err));
});

router.get("/modifypost/:postID", (req, res) => {
  let { id } = req.user;
  let { postID } = req.params;
  Post.findById(postID)
    .then((post) => {
      if (id == post.author) {
        res.render("home/modify", { user: req.user, post });
      } else {
        res.redirect("/feed");
      }
    })
    .catch((err) => console.error(err));
});

router.post("/modifypost/:postID", (req, res) => {
  let { postID } = req.params;
  let modifyObject = req.body;
  Post.findByIdAndUpdate(postID, modifyObject)
    .then((post) => {
      res.redirect("/feed");
    })
    .catch((err) => console.error(err));
});

router.post("/deletepost/:postID", (req, res) => {
  const { id } = req.user;
  let { postID } = req.params;
  Post.findById(postID)
    .then((post) => {
      if (id == post.author) {
        Post.findByIdAndDelete(postID)
          .then(() => res.redirect("/feed"))
          .catch((err) => console.log(err));
      } else {
        res.redirect("/feed");
      }
    })
    .catch((err) => console.error(err));
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

//Routes for Google Account

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, theUser, failureDetails) => {
    if (err) {
      return next(err);
    }
    req.login(theUser, (err) => {
      if (err) {
        // Session save went bad
        return next(err);
      }
      console.log("HEYEYHJEYEHEY");
      res.redirect("/feed");
    });
  })(req, res, next);
});

module.exports = router;
