const { schema, model } = require("mongoose");

const postSchema = new Schema(
  {
    text: { Type: String },
    image: { Type: String },
    html: { Type: String },
    css: { Type: String },
    js: { Type: String },
    owner: { Type: schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Post", postSchema);
