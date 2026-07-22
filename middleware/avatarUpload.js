const multer = require("multer");

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: 1,
    fileSize: 4 * 1024 * 1024,
  },

  fileFilter: (
    request,
    file,
    callback
  ) => {
    if (
      !allowedImageTypes.has(file.mimetype)
    ) {
      callback(
        new Error(
          "Only JPEG, PNG and WebP images are allowed."
        )
      );

      return;
    }

    callback(null, true);
  },
}).single("avatar");

function avatarUpload(
  request,
  response,
  next
) {
  upload(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      response.status(400).json({
        error:
          "The avatar cannot be larger than 4 MB.",
      });

      return;
    }

    response.status(400).json({
      error:
        error.message ||
        "Unable to process the image.",
    });
  });
}

module.exports = avatarUpload;