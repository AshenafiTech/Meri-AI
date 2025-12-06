import express from 'express';
import multer from 'multer';
import { uploadCV } from '../controllers/uploadController.js';
import { protect } from '../middlewares/auth.js';

const uploadRouter = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

uploadRouter.post('/cv', protect, upload.single('cv'), uploadCV);

export default uploadRouter;
