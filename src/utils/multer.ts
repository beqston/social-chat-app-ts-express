import multer, { FileFilterCallback } from "multer";
import { Response, NextFunction, Request, RequestHandler } from "express";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export default function uploadSingleImage(uploadDir: string, fieldName: string, size: number): RequestHandler[] {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ✅ Disk storage — keeps req.file.path working
    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const originalName = path.parse(file.originalname).name.replace(/\s+/g, "-");
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
            cb(null, `${originalName}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
    });

    const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const isValid =
            allowed.test(path.extname(file.originalname).toLowerCase()) &&
            allowed.test(file.mimetype);
        isValid ? cb(null, true) : cb(new Error("Images only!"));
    };

    const upload = multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter,
    }).single(fieldName);

    return [
        // Middleware 1: Multer writes file to disk → req.file.path ✅
        (req: Request, res: Response, next: NextFunction) => {
            upload(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    return res.status(400).json({ error: `Upload error: ${err.message}` });
                } else if (err) {
                    return res.status(400).json({ error: err.message });
                }
                next();
            });
        },

        // Middleware 2: Sharp reads from disk → overwrites same file
        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.file) return next();

            const filePath = req.file.path;
            const tempPath = filePath + ".tmp";

            try {
            const format = req.file.mimetype.split('/')[1] as keyof sharp.FormatEnum;

            // 2. Use it directly in Sharp

            await sharp(filePath)

                .resize(size, size, { fit: "inside", withoutEnlargement: true })

                .toFormat(format) 

                .toFile(tempPath);

                // ✅ Delete original, rename temp to original
                fs.unlinkSync(filePath);
                fs.renameSync(tempPath, filePath);

                next();
            } catch (error) {
                // Cleanup both files on failure
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                next(error);
            }
        },
    ];
}
