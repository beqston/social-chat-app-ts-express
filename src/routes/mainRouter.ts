import express, { Request, Response, NextFunction } from "express";
import path from "path";
import User from "../model/user.ts";
import isAuthUser, { tokenExpires } from "../middleware/auth.ts";
import userValidation from "../utils/userValidation.ts";
import { getChats, getLogin, getMe, getMessage, getMessages, getUsers, logout, postMessage, postLogin, postUser, createChat, getAllPMMessage, getMessagesCount } from "../controlers/userControlers.ts";
import jwt from "jsonwebtoken"
import isActive from "../middleware/isActive.ts";
import mongoose from "mongoose";
import bcrypt from "bcrypt"
import Chat from "../model/chat.ts";
import Message from "../model/messages.ts";

const router = express.Router();
// check token expires
router.use((req:Request, res:Response, next:NextFunction)=>{
  tokenExpires(req, res, next);
});
// check if is auth
router.use((req:Request, res:Response, next:NextFunction)=>{
  const isAuth = isAuthUser(req);
  const publicPaths = ['/login', '/register', "/add-user"];
  if(publicPaths.includes(req.path)){
    if(isAuth){
      res.redirect('/');
      return next()
    }
    return next();
  }
  if(!isAuth){
    return res.redirect('/login');
  }
  next()
});
// check client request interval
const lastRequests = new Map();
router.use(async(req:Request, res:Response, next:NextFunction) => {
  const isAuth = isAuthUser(req);
  if(!isAuth){
    return next();
  }
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id);
  const clientId = req.ip;
  const now = Date.now();

  if (lastRequests.has(clientId)) {
    const interval = now - lastRequests.get(clientId);

    if(interval > 2000){
      await User.findByIdAndUpdate(userID, {
      lastActiveAt: new Date(),
      active:true
    });
    }
  }

  lastRequests.set(clientId, now);
  next();
});

// check active user 
router.use((req:Request,res:Response,next:NextFunction)=>{
  isActive()
  next()
});

router.get('/', (req: Request, res: Response) => {

  res.sendFile(path.join(__dirname, '../pages/index.html'));
});

router.get('/messages', (req: Request, res: Response) => {

  res.sendFile(path.join(__dirname, '../pages/messages.html'));
});
router.get('/profile', (req: Request, res: Response) => {

  res.sendFile(path.join(__dirname, '../pages/profile.html'));
});

router.get('/users', async(req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../pages/users.html'));
});

router.get('/register', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../pages/register.html'));
});

router.get('/message/:id', getMessage)


router.route('/login').get(getLogin).post(postLogin);
router.post('/loginOut', logout)
router.post("/add-user", userValidation, postUser);
router.get('/api/v1/users', getUsers);
router.get('/api/v1/chats', getChats);
router.get('/api/v1/me', getMe)
router.post('/message/:id', postMessage);
router.route('/chat/:id').get(createChat).post(createChat);
// all my messages with populate sender and chat
router.get('/api/v1/messages', getMessages);
router.get('/api/v1/message/:id', getAllPMMessage);
router.get("/api/messages/count", getMessagesCount)

export default router;

