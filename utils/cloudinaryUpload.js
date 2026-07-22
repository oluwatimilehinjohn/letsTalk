const cloudinary = require(
  "../config/cloudinary"
);

function uploadAvatar(buffer, userId) {
  return new Promise(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder: "letstalk/avatars",
            public_id: userId,
            overwrite: true,
            invalidate: true,
            resource_type: "image",

            transformation: [
              {
                width: 512,
                height: 512,
                crop: "fill",
                gravity: "auto",
              },
            ],
          },

          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(result);
          }
        );

      uploadStream.end(buffer);
    }
  );
}

async function deleteAvatar(publicId) {
  if (!publicId) {
    return;
  }

  await cloudinary.uploader.destroy(
    publicId,
    {
      invalidate: true,
      resource_type: "image",
    }
  );
}

module.exports = {
  uploadAvatar,
  deleteAvatar,
};