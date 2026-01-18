import express from 'express';
import path from 'path';
import cors from 'cors';
import { Request, Response } from 'express';
import mainRouter from './routes/mainRouter.ts'

import dotenv from 'dotenv'
import connectDB from './mongoose/mongoose.ts';
import {WebSocketServer} from "ws"
import http from "http"
import cookieParser from "cookie-parser"
dotenv.config();
import session from "express-session";
import MongoStore  from "connect-mongo"


const app = express();


// ✅ Serve static files from root-level /public
app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser())
connectDB(process.env.MONGO_URI)

app.use(
  session({
    name: "sid", // cookie name
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
app.use(mainRouter)

app.use((req: Request, res: Response) => {
  res.status(404).send('404 Not Found');
});

const server = http.createServer(app);
const wss = new WebSocketServer({server});

wss.on("connection", (ws)=>{
  console.log('client conected')
  ws.send(JSON.stringify({message:"Welcome From Server Bro!!"}));

  ws.on('message', (data)=>{
    console.log('data message:', data.toString());
    ws.send(JSON.stringify({echo:data.toString()}))
  });

  ws.on('close', () => {
  console.log('❌ WebSocket client disconnected');
  });
})

app.listen(4000, () => {
  console.log('app listen on port 4000');
});
