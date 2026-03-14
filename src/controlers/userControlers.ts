import { Request, Response } from "express";
import path from "path";
import { validationResult } from "express-validator";
import User from "../model/user.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import Message from "../model/messages.ts";
import Chat from "../model/chat.ts";
import mongoose from "mongoose";
import isAuthUser from "../middleware/auth.ts";
import crypto from "crypto";
import SendEmail from "../utils/nodemailer.ts";
import fs from 'fs';
import Post from "../model/post.ts";
import Comment from "../model/comment.ts";


export const postUser = async (req: Request, res: Response) => {
  
    try {
      const errors= validationResult(req)
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
      console.log(error)
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
    const  token = jwt.sign({id:user.id}, secret, {expiresIn:"1d"})
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
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id)
  try {
      const users = await User.find({ _id: { $ne: userID } }).sort({ lastActiveAt: -1 });
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
export const getMyProfile =  async(req:Request, res:Response)=>{
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id)
  try {
      const user = await User.findById(userID);
      res.json({
          user
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
  const { id: chatId } = req.params;
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const userID = new mongoose.Types.ObjectId(decoded.id);

    // 1. Find the chat and get participants
    let chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found!" });

    // 2. Create the message
    const newMessage = await Message.create({
      chat: chat._id,
      sender: userID,
      text: req.body.message
    });

    // 3. Update the Chat Metadata
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

    // --- SOCKET.IO LOGIC ---
    const io = req.app.get("io");

    // A. Update the Chat Window (for people currently looking at the messages)
    io.to(chatId).emit("receive_message", newMessage);

    // B. Update the Header Count (for the recipient)
    // Find the participant who is NOT the sender
    const recipientId = chat.participants.find(p => p.toString() !== userID.toString());

    if (recipientId && io) {
      // Emit to the RECIPIENT'S ID, not the message ID
      io.to(recipientId.toString()).emit("update_count");
    }

    res.status(201).json({ success: true, data: newMessage });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating message" });
  }
}

export const getAllPMMessage = async(req: Request, res: Response) => {
  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
    const userID = new mongoose.Types.ObjectId(decoded.id);
    
    // Validate chat ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    // Verify user is a participant in this chat
    const chat = await Chat.findOne({
      _id: req.params.id,
      participants: userID
    });

    if (!chat) {
      return res.status(403).json({ message: "Unauthorized access to chat" });
    }

    const allMessagesPM = await Message.find({
      chat: req.params.id,
      deletedFor: { $ne: userID }
    })
      .populate('sender', 'username _id')       // Populate sender
      .populate('readBy.user', 'username _id')  // Populate readBy.user
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: allMessagesPM,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
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
    const deletedMessage = await Message.findByIdAndDelete(id);

    if (!deletedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Find the new last message in this chat (after deletion)
    const newLastMessage = await Message.findOne({ chat: deletedMessage.chat })
      .sort({ createdAt: -1 })
      .select("_id");

    // Update the chat's lastMessage field
    await Chat.findByIdAndUpdate(deletedMessage.chat, 
      newLastMessage 
        ? { lastMessage: newLastMessage._id }
        : { $unset: { lastMessage: "" } }
    );

    const io = req.app.get("io");

    if (io) {
      io.to(deletedMessage.chat.toString()).emit("message_deleted", {
        messageId: deletedMessage._id,
        chatId: deletedMessage.chat
      });
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

    // socket.io for update message
    const io = req.app.get("io");

    // Identify the Chat ID (Room)
    const chatId = message.chat.toString();

    // Emit the event to that specific room
    io.to(chatId).emit("message_updated", message)

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

export const markAsSeen = async (req: Request, res: Response) => {
    const { id: chatId } = req.params;
    const token = req.cookies.token;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const userID = new mongoose.Types.ObjectId(decoded.id);

        // 1. Update Database
        const result = await Message.updateMany(
            { 
              chat: chatId, 
              sender: { $ne: userID }, 
              "readBy.user": { $ne: userID } 
            },
            { 
              $addToSet: { readBy: { user: userID, readAt: new Date() } } 
            }
        );

        // 2. Real-Time Notification
        const io = req.app.get("io");
        if (io) {
            // SHOUT TO THE ROOM: "Someone just read the messages here!"
            // The sender (User A) is listening to this room and will react.
            io.to(chatId).emit("messages_seen", { 
                chatId, 
                readBy: userID.toString(),
                readAt: new Date() 
            });

            // If we actually updated unread messages, update the total badge count
            if (result.modifiedCount > 0) {
              io.to(userID.toString()).emit("update_count");
            }
        }
        res.status(200).json({ success: true, messagesMarked: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: "Error marking messages as seen" });
    }
};

export const updateUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    // chek is auth 
    const isAutUserCheck = isAuthUser(req);
    if (!isAutUserCheck) {
      return res.status(401).json({ message: "User is not authorized" });
    }
    // find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (!password?.trim() || !confirmPassword?.trim()) {
      return res.status(400).json({ message: "Password fields cannot be empty!" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.set('confirmPassword', hashedPassword);
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "User password updated!"
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUserProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // check is auth
    const isAutUserCheck = isAuthUser(req);
    if (!isAutUserCheck) {
      return res.status(401).json({ message: "User is not authorized" });
    }

    // find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // delete all messages by user
    await Message.deleteMany({ sender: id });

    // delete all chats where user is a member
    await Chat.deleteMany({ members: id });

    // find and delete user
    await User.findByIdAndDelete(id);

    // clear cookie and session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to clear session" });
      }

      res.clearCookie("sid");
      res.clearCookie("token");
      return res.json({ message: "Session cleared successfully" });
    });

    return res.status(200).json({
      status: "success",
      message: "User Deleted!"
    });

  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const postForgotPassword = async(req: Request, res: Response) => {
  const {email} = req.body;

  try {
    const user = await User.findOne({email});
    if(!user){
      return res.status(401).json({
        message:"User not found!!"
      })
    };

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // create hash token before saving to DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save()

    // send reset url
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // send mail to user
    await SendEmail(user.email, resetURL)
    
    res.status(200).json({ msg: 'If this email exists, a reset link has been sent.' });

  } catch (error) {
    res.status(500).json({
      message:"Interval server error!"
    })
  }
};

export const postResetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // check if is valid password
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg 
      });
    }
    // create hash token for reser password
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password'); 

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    user.password = password;                    
    (user as any)._isPasswordReset = true;       
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const postProfileImage = async (req: Request, res: Response) => {
  try {
    // 1. Initial Validation
    const token = req.cookies.token;
    if (!token || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path); // Cleanup if no token
      return res.status(401).json({ message: "Unauthorized or no file!" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found!" });
    }

    // --- STEP 2: DELETE OLD IMAGE FROM SERVER ---
    if (user.image) {
      // Reconstruct the full path to the old file
      // process.cwd() is the root folder. We look into /src/ + the path in DB
      const oldImagePath = path.join(__dirname, '../../', user.image);

      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.error("Failed to delete old image:", err);
        }
      }
    }

    // --- STEP 3: PREPARE NEW PATH FOR DATABASE ---
    const rawPath = req.file.path.replace(/\\/g, '/'); 
    const relativeWebPath = rawPath.substring(rawPath.indexOf('/uploads/'));

    // Update and Save
    user.image = relativeWebPath;
    await user.save();

    return res.status(200).json({
      message: "Profile image updated!",
      imageUrl: `/${relativeWebPath}`
    });

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteProfileImage = async (req: Request, res: Response)=>{

  try {
    // 1. Initial Validation
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized or no file!" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // delete image 
    if (user.image) {
      // Reconstruct the full path to the old file
      const oldImagePath = path.join(__dirname, '../../', user.image);

      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
            user.image = undefined;
             await user.save()
        } catch (err) {
          console.error("Failed to delete old image:", err);
        }
      }
    }

    return res.status(200).json({
      message:"Profile Image Deleted!!"
    })


  } catch (error) {
    return res.status(500).json({
      message:"Interval server error!!"
    })
  }
}

export const postSearchUser = async (req: Request, res: Response) => {
  const { search } = req.body;

  if (!search || search.trim() === "") {
    return res.status(400).json({ message: "Search query is required!" });
  }

  try {
    const users = await User.find({
      username: { $regex: search, $options: "i" }  
    }).select("-password");  

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found!" });
    }

    res.status(200).json({ users });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error!" });
  }
};

export const createNewPost = async (req: Request, res: Response) => {
  const { text } = req.body;
  const file = req.file;
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userID = new mongoose.Types.ObjectId(decoded.id);

  try {
    // 1. Validation: Ensure either text was written OR a file was uploaded
    if (!text && !file) {
      return res.status(400).json({ message: "Please provide text or an image!" });
    }

    // 2. Prepare the data for the database
    const postData = {
      text: text || undefined,
      image: file ? `/uploads/posts/${file.filename}` : undefined,
      user: userID
    };

    // 3. Create the post
    const post = await Post.create(postData);
    await User.findByIdAndUpdate(userID, {
      $push: { posts: post._id }
    }, { new: true });

    // 4. Success Response
    res.status(201).redirect('/');

  } catch (error) {
    console.error("Post Creation Error:", error);
    res.status(500).json({ message: "Internal server error while creating post." });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    // find all post and sort, new post is first
    const posts = await Post.find().populate("user", "_id username image").sort({ createdAt: -1 });

    // Check for an empty array if you want to send a specific message
    if (posts.length === 0) {
      return res.status(200).json({ data: [], message: "No posts yet!" });
    }

    res.status(200).json({ data: posts });
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ message: "Internal server error!!" });
  }
};

export const postComment = async (req: Request, res: Response) => {
  const { text, postId } = req.body;

  try {
    // ✅ Token verification inside try/catch
    const decoded = jwt.verify(
      req.cookies.token,
      process.env.JWT_SECRET!
    ) as { id: string };
    const userId = new mongoose.Types.ObjectId(decoded.id);

    if (!text) {
      return res.status(400).json({ message: "Please provide text" });
    }

    if (!postId) {
      return res.status(400).json({ message: "Something went wrong!" });
    }

    // ✅ Validate that the post actually exists
    const postExists = await Post.findById(postId);
    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = await Comment.create({
      text,
      user: userId,
      post: postId,
    });

    // --- SOCKET.IO LOGIC ---
    const io = req.app.get("io");
    
    // Populate the user so the client has username + image
    await newComment.populate("user", "username image _id"); 

    // Emit to all connected clients
    io.emit("new_comment", { 
        postId: postId, 
        comment: newComment 
    });

    res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    // ✅ Handle JWT errors specifically
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid or missing token" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getPostComments = async (req: Request, res: Response) => {
  const { postId } = req.params;

  try {
    const postExists = await Post.findById(postId);
    if (!postExists) return res.status(404).json({ message: "Post not found" });

    const comments = await Comment.find({ post: postId })
      .populate("user", "username image") 
      .sort({ createdAt: 1 });

    res.status(200).json({ comments });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOtherUserProfile = async (req: Request, res: Response) =>{
  const {id} = req.params;
  try {
    const findUser = await User.findById(id).populate("posts");
    if(!findUser){
      return res.status(404).json({message:"User nor found!!"})
    }

    res.status(200).json({user:findUser})
  } catch (error) {
    res.status(500).json({
      message:"Interval server error"
    })
  }
}

export const postLike = async (req: Request, res: Response) => {
  const { id } = req.params;
  const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET!) as { id: string };
  const userId = new mongoose.Types.ObjectId(decoded.id);

  try {
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found!!" });
    }

    const isLiked = post.likes.some((likeId) => likeId.toString() === userId.toString());

    if (isLiked) {
      await Post.findByIdAndUpdate(id, { $pull: { likes: userId } });
      return res.status(200).json({ message: "Like removed" });
    } 

    await Post.findByIdAndUpdate(id, { $addToSet: { likes: userId } });
    return res.status(201).json({ message: "Like added" });

  } catch (error) {
    res.status(500).json({ message: "Internal server error!!" });
  }
};

export const editComment = async (req: Request, res: Response) => {
  const { commentId } = req.params; 
  const { text } = req.body;

  // 1. Don't allow empty comments
  if (!text || text.trim() === "") {
    return res.status(400).json({ message: "Comment text cannot be empty!" });
  }

  try {
    // 2. Update the document
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId, 
      { text }, 
      { new: true } 
    );

    // 3. Check if the comment actually existed
    if (!updatedComment) {
      return res.status(404).json({ message: "Comment not found!" });
    }

    // Emit the update to everyone
    const io = req.app.get("io");
    
    // sent data to frontend
    io.emit("comment_updated", {
      commentId,
      newText: text,
      postId:updatedComment.post
    })

    return res.status(200).json({ 
      message: "Comment edited successfully!!",
      comment: updatedComment
    });

  } catch (error) {
    console.error("Error editing comment:", error); // Helpful for your terminal
    return res.status(500).json({ message: "Internal server error!!" });
  }
};

export const deleteComment = async (req: Request, res: Response) =>{
  const {commentId} = req.params;
  
  try {
    const comment = await Comment.findByIdAndDelete(commentId);

    if(!comment){
      return res.status(404).json({
        message:"Comment not found!!"
      })
    }

    // initialize socket.io
    const io = req.app.get("io");

    // send to frontend
    io.emit("comment_deleted", {
      commentId,
      postId: comment.post
    })

    res.status(200).json({message:"Comment deleted!!"});

  } catch (error) {
    res.status(500).json({message:"Interval server error!!"})
  }
}

export const deletePost = async (req: Request, res: Response) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId); // ← just find first, don't delete yet

    if (!post) {
      return res.status(404).json({
        message: "Post not found!!"
      });
    }

    await Comment.deleteMany({ post: postId });

    await Post.findByIdAndDelete(postId);

    if (post.image) {
      const imagePath = path.join(__dirname, "../../", post.image);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error("Failed to delete old image:", err);
        }
      }
    }

    res.status(200).json({ message: "Post deleted!!" });

  } catch (error) {
    res.status(500).json({ message: "Internal server error!!" });
  }
};

export const editPost = async (req: Request, res: Response) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId); 

    if (!post) {
      return res.status(404).json({
        message: "Post not found!!"
      });
    }


    res.status(200).json({ message: "Post edited!!" });

  } catch (error) {
    res.status(500).json({ message: "Internal server error!!" });
  }
};