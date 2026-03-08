import express, { Request, Response, NextFunction } from "express";
import path from "path";
import User from "../model/user.ts";
import isAuthUser, { tokenExpires } from "../middleware/auth.ts";
import userValidation, { passwordRules } from "../utils/userValidation.ts";
import { getChats, getLogin, getMe, getMessage, getUsers, logout, postMessage, postLogin, postUser, createChat, getAllPMMessage, getMessagesCount, deleteMessage, updateMessage, deleteChat, markAsSeen, updateUserPassword, deleteUserProfile, postForgotPassword, postResetPassword, postProfileImage, deleteProfileImage, postSearchUser, createNewPost, getAllPosts } from "../controlers/userControlers.ts";
import jwt from "jsonwebtoken"
import isActive from "../middleware/isActive.ts";
import uploadSingleImage from "../utils/multer";

const router = express.Router();

// check token expires
router.use((req:Request, res:Response, next:NextFunction)=>{
  tokenExpires(req, res, next);
});
// check if is auth
router.use((req:Request, res:Response, next:NextFunction)=>{
  const isAuth = isAuthUser(req);
  const publicPaths = ['/login', '/register', "/add-user", "/forgot-password"];
  if(publicPaths.includes(req.path) || req.url.startsWith("/reset-password/")){
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
    console.error(err)
  }
  next();
});

// update token
router.use(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    let userID: string | null = null;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; iat: number };

      const UPDATE_TOKEN = 2 * 60 * 60; // 2 hours in seconds
      const now = Math.floor(Date.now() / 1000);

      if (now - decoded.iat < UPDATE_TOKEN) {
        return next(); // Token still fresh
      }

      userID = decoded.id;

    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        const decoded = jwt.decode(token) as { id: string } | null;
        if (!decoded?.id) {
          res.clearCookie("token");
          return next();
        }
        userID = decoded.id;
      } else {
        // Tampered or invalid token
        res.clearCookie("token");
        return next();
      }
    }

    if (!userID) return next(); // Safety guard

    const user = await User.findById(userID);
    if (!user) {
      res.clearCookie("token");
      return next();
    }

    // Issue refreshed token
    const newToken = jwt.sign({ id: userID }, process.env.JWT_SECRET!, { expiresIn: "1d" });

    res.cookie("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    if (req.session) {
      req.session.userID = userID;
    }

  } catch (err) {
    console.error("Token refresh error:", err);
  }

  return next();
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

router.get('/forgot-password', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../pages/forgot.html'));
});

// post forgot password
router.post('/forgot-password', postForgotPassword);

// get reset password page
router.get('/reset-password/:token', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../pages/resetPassword.html'));
});

// POST route too
router.post('/reset-password/:token', passwordRules, postResetPassword);

router.get('/message/:id', getMessage)
router.route('/login').get(getLogin).post(postLogin);
router.post('/login-out', logout);

// create new user
router.post("/add-user", userValidation, postUser);

// create new post
router.post("/add-post", ...uploadSingleImage(path.join(__dirname, "../../uploads/posts"), "image", 500), createNewPost)

// upload profile image
router.post(
    '/upload/profile-image',
    ...uploadSingleImage(path.join(__dirname, "../../uploads/profile"), "image", 120),
    postProfileImage
);

// Delete Profile Image
router.delete('/delete/profile-image', deleteProfileImage);

// user api
router.get('/api/v1/users', getUsers);
// chat api
router.get('/api/v1/chats', getChats);
// post api
router.get('/api/v1/posts', getAllPosts);
// get me route
router.get('/api/v1/me', getMe);
// message crud operations
router.route('/message/:id').post(postMessage).patch(updateMessage).delete(deleteMessage);
// chat crud operations
router.route('/chat/:id').get(createChat).post(createChat).delete(deleteChat);
// search route, get and post request
router.route("/search").get((req: Request, res: Response)=>{
  res.sendFile(path.join(__dirname, '../pages/search.html'));
}).post(postSearchUser);

// user update user password
router.patch("/user/update-password/:id", updateUserPassword);
// user profile delete route
router.delete("/user/delete-profile/:id", deleteUserProfile);

// get all pm message in chat
router.get('/api/v1/message/:id', getAllPMMessage);
router.get("/api/messages/count", getMessagesCount);
// message seen route
router.post("/api/v1/message/seen/:id", markAsSeen)

export default router;
