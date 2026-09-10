const {
  v2: cloudinary,
} = require("cloudinary");

// Avatar operations validate configuration at use time so local chat can run without Cloudinary.

cloudinary.config({
  secure: true,
});

module.exports = cloudinary;