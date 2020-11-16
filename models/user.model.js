const { schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    email: { type: String, unique: true },
    name: { type: String },
    lastName: { type: String },
    image: { Type: String },
    passwordHash: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = model("User", userSchema);
