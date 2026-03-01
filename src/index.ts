import express from 'express';
import path from 'path';
import cors from 'cors';
import { Request, Response } from 'express';
import mainRouter from './routes/mainRouter.ts'

import dotenv from 'dotenv'
import connectDB from './mongoose/mongoose.ts';
import { Server } from "socket.io"
import http from "http"
import cookieParser from "cookie-parser"
dotenv.config();
import session from "express-session";
import MongoStore  from "connect-mongo"


const app = express();
//  Create the HTTP server explicitly using the Express app
const server = http.createServer(app);

//  Initialize Socket.io and attach it to the HTTP server
const io = new Server(server, {
  cors: {
    // If your frontend is running on a different port, 
    // you need to allow it here. If serving static files from this app, you can remove this.
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// set io in app
app.set("io", io);

// ✅ Serve static files from root-level /public
app.use(express.static(path.join(__dirname, '../public')));

// upload middleware
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
connectDB(process.env.MONGO_URI)

app.use(
  session({
    name: "sid", 
    secret: process.env.SESSION_SECRET || "sessionSecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI!, // MongoDB connection
      collectionName: "sessions"        // collection in MongoDB
    })
  })
);
app.use(mainRouter);

// Socket.io Connection Event
io.on("connection", (socket) => {
  // Get userId from auth (you need to pass this from frontend)
  const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
  
  if (userId) {
    socket.join(userId.toString());
  }

  // 1. Join a specific chat room
  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
  });

  // 2. Handle sending messages (if you want to send via socket instead of HTTP)
  socket.on("send_message", (data) => {
    if (data.chatId) {
      io.to(data.chatId).emit("receive_message", data);
    } else {
      socket.broadcast.emit("receive_message", data); 
    }
  });

  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("user_typing", data);
  });

  socket.on("disconnect", () => {
    
  });
});


app.use((req: Request, res: Response) => {
  res.status(404).send('404 Not Found');
});

server.listen(4000, () => {
  console.log('Server is running on port 4000 (Socket.io is now active)');
});
