const { Router } = require("express");
const router = new Router();
// Post model
const Post = require("../models/Post.model");

// Comment model
const Comment = require("../models/Comment.model");

router.get("/feed", checkUserStatus, (req, res) => {
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
      posts = posts.reverse();
      res.render("home/feed", {
        user: req.user,
        posts,
      });
    })
    .catch((err) => res.send("There has been an error"));
});

router.get("/newpost", checkUserStatus, (req, res) => {
  res.render("home/newpost", { user: req.user });
});

router.post("/newpost", checkUserStatus, (req, res) => {
  let { id } = req.user;
  const { text, html, css, js } = req.body;
  Post.create({ text, html, css, js, author: id })
    .then(() => res.redirect("/feed"))
    .catch((err) => console.error(err));
});

router.get("/modifypost/:postID", checkUserStatus, (req, res) => {
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

router.post("/modifypost/:postID", checkUserStatus, (req, res) => {
  let { postID } = req.params;
  let modifyObject = req.body;
  Post.findByIdAndUpdate(postID, modifyObject)
    .then((post) => {
      res.redirect("/feed");
    })
    .catch((err) => console.error(err));
});

router.post("/deletepost/:postID", checkUserStatus, (req, res) => {
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

router.get("/post/:postID", checkUserStatus, (req, res) => {
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
      res.render("home/postview", { posts: [post], user: req.user });
    })
    .catch((err) => console.error(err));
});

router.post("/post/:postID/addcomment", checkUserStatus, (req, res) => {
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

router.post(
  "/post/:postID/modifycomment/:commentID",
  checkUserStatus,
  (req, res) => {
    const { postID, commentID } = req.params;
    const { text } = req.body;
    Comment.findByIdAndUpdate(commentID, { text })
      .then((comment) => res.redirect(`/post/${postID}`))
      .catch((err) => console.error(err));
  }
);

router.post(
  "/post/:postID/deletecomment/:commentID",
  checkUserStatus,
  (req, res) => {
    const { postID, commentID } = req.params;
    const { text } = req.body;
    Comment.findByIdAndDelete(commentID)
      .then((comment) => res.redirect(`/post/${postID}`))
      .catch((err) => console.error(err));
  }
);

function checkUserStatus(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

module.exports = router;
