import express, { Request, Response, NextFunction } from "express";
import path from "path";
import User from "../model/user.ts";
import isAuthUser, { tokenExpires } from "../middleware/auth.ts";
import userValidation from "../utils/userValidation.ts";
import { getChats, getLogin, getMe, getMessage, getMessages, getUsers, logout, postMessage, postLogin, postUser, createChat, getAllPMMessage, getMessagesCount, deleteMessage, updateMessage, deleteChat } from "../controlers/userControlers.ts";
import jwt from "jsonwebtoken"
import isActive from "../middleware/isActive.ts";
import mongoose from "mongoose";
import bcrypt from "bcrypt"
import Chat from "../model/chat.ts";
import Message from "../model/messages.ts";
import { error } from "console";

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

// check user last active and update it
const lastUpdates = new Map<string, number>(); 
const UPDATE_THRESHOLD = 3 * 60 * 1000; 

router.use((req: Request, res: Response, next: NextFunction) => {
  const isAuth = isAuthUser(req);
  if (!isAuth) return next();

  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
    const userID = decoded.id;
    const now = Date.now();
    const lastUpdate = lastUpdates.get(userID);

    if (!lastUpdate || (now - lastUpdate) > UPDATE_THRESHOLD) {
      if (lastUpdates.size > 3000) {
        lastUpdates.clear();
      };
      lastUpdates.set(userID, now);

      
      User.findByIdAndUpdate(userID, {
        lastActiveAt: new Date(),
        active: true
      }).catch(err => console.error("Update active status failed", err));
    }
  } catch (err) {
    console.log(error)
  }
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
router.post('/login-out', logout)
router.post("/add-user", userValidation, postUser);
router.get('/api/v1/users', getUsers);
router.get('/api/v1/chats', getChats);
router.get('/api/v1/me', getMe)
router.route('/message/:id').post(postMessage).patch(updateMessage).delete(deleteMessage);
router.route('/chat/:id').get(createChat).post(createChat).delete(deleteChat);
// all my messages with populate sender and chat
router.get('/api/v1/messages', getMessages);
router.get('/api/v1/message/:id', getAllPMMessage);
router.get("/api/messages/count", getMessagesCount)

export default router;

