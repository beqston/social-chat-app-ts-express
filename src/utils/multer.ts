import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import fs from "fs";
import path from "path";

export default function uploadImage(uploadDir: string) {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
          // 1. Get the original name without the extension
          const originalName = path.parse(file.originalname).name.replace(/\s+/g, '-');
          
          // 2. Create a truly unique suffix using date + large random number
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          
          // 3. Combine: original-17154321-999.jpg
          cb(null, `/${originalName}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

    const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const isValid =
            allowed.test(path.extname(file.originalname).toLowerCase()) &&
            allowed.test(file.mimetype);
        isValid ? cb(null, true) : cb(new Error("Images only!"));
    };

    return multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter,
    });
}