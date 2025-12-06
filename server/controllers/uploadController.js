// Google Cloud Storage CV upload controller
import { Storage } from '@google-cloud/storage';
import path from 'path';

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS // path to service account JSON
});
const bucketName = process.env.GCLOUD_BUCKET_NAME;

export const uploadCV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const file = req.file;
    const blob = storage.bucket(bucketName).file(`cv/${Date.now()}_${file.originalname}`);
    const blobStream = blob.createWriteStream({ resumable: false });

    blobStream.on('error', err => {
      res.status(500).json({ success: false, message: err.message });
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      res.status(200).json({ success: true, url: publicUrl });
    });

    blobStream.end(file.buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
