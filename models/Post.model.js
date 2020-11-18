const { Schema, model } = require("mongoose");

const postSchema = new Schema(
  {
    text: { type: String },
    image: { type: String },
    html: { type: String },
    css: { type: String },
    js: { type: String },
    author: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Post", postSchema);
