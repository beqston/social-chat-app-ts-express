import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export default function isAuthUser(req: Request): boolean {
  const userSession = req.session?.userID;
  const token = req.cookies?.token; // cookie name must match what you set
  return Boolean(userSession && token);
}

export function tokenExpires(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    jwt.verify(token, process.env.JWT_SECRET || "secret");
    return next(); // Token valid
  } catch (err) {
    // Expired or invalid
    res.clearCookie("token");
    res.clearCookie("sid");

    if (req.session?.userID) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return res.status(500).json({ message: "Failed to clear session" });
        }
        return next();
      });
    } else {
      return next();
    }
  }
}
