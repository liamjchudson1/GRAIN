import multer from 'multer';
import path from 'path';
import fs from 'fs';

const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Posts storage
const postsDir = path.join(process.cwd(), 'uploads', 'posts');
ensureDir(postsDir);

// Avatars storage
const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
ensureDir(avatarsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route avatars to their own folder based on fieldname
    const dest = file.fieldname === 'avatar' ? avatarsDir : postsDir;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});
