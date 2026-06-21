const { Readable } = require("stream")
const cloudinary = require("cloudinary").v2
const { config } = require("../config")

const cloudinaryReady = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
)

if (cloudinaryReady) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  })
}

function uploadBuffer(file) {
  if (!cloudinaryReady) {
    return Promise.resolve({
      provider: "metadata-only",
      url: null,
      publicId: null,
      note: "Cloudinary upload skipped because CLOUDINARY_CLOUD_NAME/API credentials are incomplete.",
    })
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "meditrust-ai/reports",
        resource_type: "auto",
        type: "authenticated",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error)
        else {
          resolve({
            provider: "cloudinary",
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            protected: true,
          })
        }
      },
    )

    Readable.from(file.buffer).pipe(stream)
  })
}

module.exports = { uploadBuffer, cloudinaryReady }
