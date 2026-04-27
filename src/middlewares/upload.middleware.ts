import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'gif'];
const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10)) * 1024 * 1024;
const UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'content-broadcasting';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    return {
      folder: UPLOAD_FOLDER,
      resource_type: 'image',
      format: ext,
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_FORMATS.includes(ext)) {
    cb(new Error('Only JPG, PNG, and GIF files are allowed.'));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

export const handleUploadError = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      message: `File too large. Max size is ${process.env.MAX_FILE_SIZE_MB ?? 10}MB.`,
    });
    return;
  }
  if (err.message === 'Only JPG, PNG, and GIF files are allowed.') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }
  next(err);
};
