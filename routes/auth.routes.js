const { Router } = require("express");
const router = new Router();
const { format } = require("date-fns");
const fileUploader = require("../configs/cloudinary.config")
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

router.get("/signup", checkUserStatus, (req, res, next) =>
  res.render("auth/signup")
);

//POST route ==> to process form data
// here is where we have to work with the picture
router.post("/signup", fileUploader.single("image"), (req, res, next) => {
  const { firstname, lastname, email, password, confirmpassword } = req.body;

  console.log(req.file)

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
            imageUrl: req.file.path
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
router.get("/login", checkUserStatus, (req, res, next) =>
  res.render("auth/login")
);

//POST route ==> to process form data
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.render("auth/login", {
      email,
      errorMessage: "All fields are mandatory. Please fill the all blanks",
    });
    return;
  }

  passport.authenticate("local", (err, theUser, failureDetails) => {
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

router.get("/login", checkUserStatus, (req, res, next) => {
  res.render("auth/login", { errorMessage: req.flash("error") }); // !!!
});

/*router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true, // !!!
  })
);*/



router.get("/feed", (req, res) => {
  if (!req.user) {
    res.redirect("/");
  } else {
    Post.find()
      .populate("author")
      .populate("comments")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          model: "User",
        },
      })
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
  Post.create({ text, html, css, js, author: id })
    .then(() => res.redirect("/feed"))
    .catch((err) => console.error(err));
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
          .catch((err) => console.error(err));
      } else {
        res.redirect("/feed");
      }
    })
    .catch((err) => console.error(err));
});

router.get("/post/:postID", (req, res) => {
  let { postID } = req.params;
  Post.findById(postID)
    .populate("author")
    .populate("comments")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        model: "User",
      },
    })
    .then((post) => {
      console.log(post);
      res.render("home/postview", { posts: [post], user: req.user });
    })
    .catch((err) => console.error(err));
});

router.post("/post/:postID/addcomment", (req, res) => {
  const { postID } = req.params;
  const { text } = req.body;
  Post.findById(postID).then((post) => {
    let newComment;
    newComment = new Comment({ author: req.user._id, text });
    newComment.save().then((comment) => {
      post.comments.push(comment._id);
      post.save().then((updatedPost) => res.redirect(`/post/${postID}`));
    });
  });
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
      res.redirect("/feed");
    });
  })(req, res, next);
});

function checkUserStatus(req, res, next) {
  if (!req.user) {
    next();
  } else {
    res.redirect("/feed");
  }
}

//Privacy part in sign up 
router.get("/privacy", (req, res, next) => res.render("privacy"));


module.exports = router;

