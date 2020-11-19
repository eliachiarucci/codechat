const express = require("express");
const router = express.Router();

/* GET home page */
router.get("/", checkUserStatus, (req, res, next) => {
  res.render("index");
});

function checkUserStatus(req, res, next) {
  if (!req.user) {
    next();
  } else {
    res.redirect("/feed");
  }
}

module.exports = router;
