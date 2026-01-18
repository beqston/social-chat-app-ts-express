import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export default function isAuthUser(req: Request): boolean {
  const userSession = req.session?.userID;
  const token = req.cookies?.token; // cookie name must match what you set
  return Boolean(userSession && token);
}

export function tokenExpires(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  // If no token, just continue (login/signup routes will have no token)
  if (!token) {
    return next();
  }else{
    const decode =jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if(!decode){
      // Token invalid or expired
      res.clearCookie("token");
      res.clearCookie("sid");
      if(req.session.userID){
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to clear session" });
        }
       });
      }
      return next()
    }
    return next()
  }
}

export const AutUserFullCheck = (req:Request)=>{
    const user = req?.cookies?.user;
    const token = req?.cookies?.token;
    const headerUser = req.headers.authorization;

    if(user && headerUser && token){
       return true;
    }else{
        return false;
    }
}