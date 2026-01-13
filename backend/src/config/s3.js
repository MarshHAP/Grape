const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  },
  forcePathStyle: true // Required for R2 and some S3-compatible services
});

const bucket = process.env.S3_BUCKET || 'grape-videos';

async function getUploadUrl(key, contentType, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

async function getDownloadUrl(key, expiresIn = 86400) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

async function uploadFile(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read'
  });

  await s3Client.send(command);

  // Return the public URL
  const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION}.amazonaws.com`;
  return `${endpoint}/${bucket}/${key}`;
}

async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return s3Client.send(command);
}

function getPublicUrl(key) {
  const endpoint = process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION}.amazonaws.com`;
  return `${endpoint}/${bucket}/${key}`;
}

module.exports = {
  s3Client,
  bucket,
  getUploadUrl,
  getDownloadUrl,
  uploadFile,
  deleteFile,
  getPublicUrl
};
