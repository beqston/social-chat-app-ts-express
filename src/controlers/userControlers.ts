import { Request, Response } from "express";
import path from "path";
import { validationResult } from "express-validator";
import User from "../model/user.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import Message from "../model/messages.ts";
import Chat from "../model/chat.ts";
import mongoose from "mongoose";

export const postUser = async (req: Request, res: Response) => {
    try {
      const errors= validationResult(req.body)
      if(!errors.isEmpty()){
        return res.status(400).json({
        errors: errors.array(),
      });
      };
      const emailExists = await User.findOne({email:req.body.email});
      if(emailExists){
        return res.status(400).json({
          status:"failed",
          message:"Email alredy exists"
        })
      }

        if(req.body.password !== req.body.confirmPassword){
          return res.status(400).json({
            status:"failed",
            message:"Passwords Does Not Matches"
          })
        };
        const user = new User(req.body);
        await user.save();
        const secret = process.env.JWT_SECRET || "secretToken"
        const  token = jwt.sign({id:user.id}, secret, {expiresIn:"2d"})
        res.cookie("token", token, {
            httpOnly: true,       // prevents JS from reading it
            secure: process.env.NODE_ENV === "production", // HTTPS only in prod
            sameSite: "lax",      // CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });
        req.session.userID = user.id.toString();
        return res.json({ status: "succses", user:{
            id:user.id,
            username:user.username,
            email:user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }});
    } catch (error: any) {
      return  res.status(500).json({ error: error.message });
    }
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to clear session" });
    }

    res.clearCookie("sid");
    res.clearCookie("token");
    return res.json({ message: "Session cleared successfully" });
  });
};

export const postLogin = async(req: Request, res: Response) => {
  try {
    const user = await User.findOne({username:req.body.username.toLowerCase()}).select("+password");

    if(!user){
      return res.status(401).json({
        status:"failed",
        message:"User not found!"
      })
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if(!isMatch){
      return res.status(401).json({
        status:"failed",
        message:"Password does not match!"
      })
    }
    const secret = process.env.JWT_SECRET || "secretToken"
    const  token = jwt.sign({id:user.id}, secret, {expiresIn:"2d"})
    res.cookie("token", token, {
        httpOnly: true,       // prevents JS from reading it
        secure: process.env.NODE_ENV === "production", // HTTPS only in prod
        sameSite: "lax",      // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    req.session.userID = user.id.toString();
    await User.findByIdAndUpdate(user._id, {
      lastActiveAt: new Date(),
      active:true
    });

    return res.status(201).redirect('/')
  } catch (error) {
    return res.status(500).send(`<h1>Interval server error: ${error}</h1>`)
  }
}

export const getLogin = (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../pages/login.html'));
}

export const getChats = async(req:Request, res:Response)=>{
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
      const userID = new mongoose.Types.ObjectId(decoded.id)

      // 1. get all chats
      const chats = await Chat.aggregate([
        { $match: { 
          participants: userID,
          deletedBy: { $nin: [userID] }
        }},
        {
         $lookup: {
            from:"messages",
            let: { chatId: "$_id" },
            pipeline:[
              {
                $match:{
                  $expr:{
                    $and:[
                      {$eq: ["$chat", "$$chatId"] },
                      {$ne:["$sender", userID]},
                      {$not: {$in:[userID, "$readBy.user"]}}
                    ]
                  }
                }
              }
            ],
            as: "unreadMessages"
          }
        },
        {
          $lookup: {
            from: "messages", 
            localField: "lastMessage",
            foreignField: "_id",
            as: "lastMessage"
          }
        },
        {
          $unwind: {
            path: "$lastMessage",
            preserveNullAndEmptyArrays: true 
          }
        },

        {
          $addFields: {
            unreadCount: { $size: "$unreadMessages" }
          }
        },
        { $project: { unreadMessages: 0 } },

        { $sort: { updatedAt: -1 } }
      ])
      
      res.json({
        data:chats
      });

    } catch (error) {
        res.status(500).json({
            status:'fail',
            message:error
        })
    }
}

export const getUsers =  async(req:Request, res:Response)=>{
    try {
        const users = await User.find().sort({lastActiveAt:-1})
        res.json({
            data:users
        })
        
    } catch (error) {
        res.status(500).json({
            status:'fail',
            message:error
        })
    }
}

export const getMe = (req:Request, res:Response)=>{
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };;
    const userID = decoded.id;

    res.json(userID)
  } catch (error) {
    res.json({
      message:"User not found!"
    })
  }
}

export const getMessages = async(req:Request, res:Response)=>{
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
      const userID = new mongoose.Types.ObjectId(decoded.id)
      const messages = await Message.find({
        chat: {
          $in: await Chat.find({ participants: userID }).distinct("_id")
        }
      })
      .populate("sender")
      .populate("chat");

      res.json({
        data:messages
      })
    } catch (error) {
        res.status(500).json({
            status:'fail',
            message:error
        })
    }
}

export const createChat = async (req: Request, res: Response) => {
  const { id } = req.params;
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id)

  try {
  // 1 create chat
  let chat = await Chat.findOne({
   participants: { $all: [userID, id] }
  });
  if (!chat) {
    // Create new
    chat = await Chat.create({ participants: [userID, id], deletedBy: [id]});
  }
      await Chat.findByIdAndUpdate(
      chat._id,
      {
        $set: { 
          deletedBy: [], 
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    res.redirect(`/message/${chat._id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating message/chat");
  }
}

export const postMessage = async (req: Request, res: Response) => {
  const { id: chatId } = req.params; // This is the Chat ID from the URL
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userID = new mongoose.Types.ObjectId(decoded.id);

    // 1. Find the chat by ID
    let chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found!" });

    // 2. Create the message
    const newMessage = await Message.create({
      chat: chat._id,
      sender: userID,
      text: req.body.message
    });

    // 1. Remove sender from 'deletedBy' so the chat reappears in their list
    // 2. Update 'lastMessage' and 'updatedAt' for proper list sorting
    // 3. Clears the entire array so the chat is visible to all participants
    await Chat.findByIdAndUpdate(
      chatId,
      {
        $set: { 
          deletedBy: [], 
          lastMessage: newMessage._id,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    // use socket.io for message
    const io = req.app.get("io");
    io.to(chatId).emit("receive_message", newMessage);
    
    // 3. Return the new message as JSON (Better than redirect for Chat Apps)
    res.status(201).json({ success: true, data: newMessage });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating message" });
  }
}

export const getAllPMMessage = async(req: Request, res: Response)=>{
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id)
  const allMessagesPM = await Message.find({
    chat:{
      $in: await Chat.find({_id:req.params.id})
    },
    deletedFor:{$ne:userID}
  })

  res.json({
    data:allMessagesPM,
  });
}

export const getMessage = async(req: Request, res: Response)=>{
  const chatId = req.params.id;
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id)
  
  await Message.updateMany(
        { 
          chat: chatId, 
          sender: { $ne: userID },
          "readBy.user": { $ne: userID }
        },
        { 
          $push: { readBy: { user: userID, readAt: new Date() } } 
        }
    );
  res.status(200).sendFile(path.join(__dirname, '../pages/message.html'))
}

export const getMessagesCount = async(req: Request, res: Response)=>{
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id)
  
  try {
    const userChatsIds = await Chat.find({participants:userID}).distinct("_id")
    const unreadCount = await Message.countDocuments({
      chat: {$in:userChatsIds},
      "readBy.user":{$ne:userID},
      sender:{$ne: userID},
      deletedFor:{$ne:userID}
    });
    res.status(200).json({ count: unreadCount });
  } catch (error) {
    res.status(500).send("Server Error");
  }
}

export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await Message.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  const { id: messageID } = req.params;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const message = await Message.findByIdAndUpdate(
      { _id: messageID }, 
      { text: req.body.message }, 
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Message updated successfully",
      data: message
    });

  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteChat = async (req: Request, res: Response)=>{

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const {id:chatID}= req.params;
   const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
   const userID = new mongoose.Types.ObjectId(decoded.id)

  try {
    const chat = await Chat.findByIdAndUpdate(chatID, 
      {
        $addToSet: { deletedBy: userID }
      },
      {
        new:true
      }
    );
    if(!chat){
      return res.status(404).json({ message: "Chat not found" });
    }

    if(chat?.deletedBy && chat.deletedBy.length >= chat.participants.length){
      await Chat.findByIdAndDelete(chatID);
      await Message.deleteMany({chat:chatID});
      return res.status(200).json({ message: "Chat and history fully deleted." });
    }
    
    await Message.updateMany({chat:chatID}, {$push:{deletedFor:userID}})
    return res.status(200).json({
      success: true,
      message: "Chat Deleted successfully",
      data: chat
    });
  } catch (error) {
    res.status(500).json({
      message:"Interval Server Error"
    })
  }
}