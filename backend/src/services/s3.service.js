const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs   = require('fs');
const path = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

const uploadFile = async (localPath, s3Key, mimeType) => {
  const body = fs.createReadStream(localPath);
  const size = fs.statSync(localPath).size;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key,
    Body: body, ContentType: mimeType, ContentLength: size,
    ServerSideEncryption: 'AES256',
  }));
  return s3Key;
};

const getPresignedUrl = async (s3Key, expiresInSeconds = 3600) => {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
};

const deleteFile = async (s3Key) => {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
};

const buildS3Key = (filename) => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext   = path.extname(filename).toLowerCase();
  const base  = path.basename(filename, ext);
  return `media/${year}/${month}/${base}${ext}`;
};

module.exports = { uploadFile, getPresignedUrl, deleteFile, buildS3Key };