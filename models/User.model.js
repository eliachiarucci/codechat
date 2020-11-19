const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    googleId: String,
    imageUrl: String,
  },
  {
    timestamps: true,
  }
);

module.exports = model("User", userSchema);
