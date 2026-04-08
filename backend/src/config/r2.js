'use strict';

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

let s3Client = null;

function getClient() {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Upload a file buffer to Cloudflare R2.
 * @param {Buffer} buffer - File content
 * @param {string} key - Object key/path in bucket (e.g. 'documentos/uuid-doc.pdf')
 * @param {string} mimeType - MIME type for Content-Type header
 * @returns {Promise<string>} The R2 object key
 */
async function uploadFile(buffer, key, mimeType) {
  const client = getClient();
  const bucket = R2_BUCKET_NAME || 'encontramed-docs';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await client.send(command);
  logger.info(`R2: uploaded ${key} (${buffer.length} bytes)`);
  return key;
}

/**
 * Generate a pre-signed URL for private R2 object access.
 * @param {string} key - Object key in bucket
 * @param {number} expiresInSeconds - URL expiry time in seconds (default: 3600)
 * @returns {Promise<string>} Pre-signed URL
 */
async function getPresignedUrl(key, expiresInSeconds = 3600) {
  const client = getClient();
  const bucket = R2_BUCKET_NAME || 'encontramed-docs';

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return url;
}

/**
 * Returns the public URL for an object if R2_PUBLIC_URL is configured.
 * @param {string} key - Object key in bucket
 * @returns {string|null} Public URL or null
 */
function getPublicUrl(key) {
  if (!R2_PUBLIC_URL) return null;
  const base = R2_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/${key}`;
}

/**
 * Delete a file from Cloudflare R2.
 * @param {string} key - Object key in bucket
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  const client = getClient();
  const bucket = R2_BUCKET_NAME || 'encontramed-docs';

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
  logger.info(`R2: deleted ${key}`);
}

module.exports = { uploadFile, getPresignedUrl, getPublicUrl, deleteFile };
