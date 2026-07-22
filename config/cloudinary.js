const {
  v2: cloudinary,
} = require("cloudinary");

if (!process.env.CLOUDINARY_URL) {
  throw new Error(
    "CLOUDINARY_URL is missing from the environment variables"
  );
}

cloudinary.config({
  secure: true,
});

module.exports = cloudinary;