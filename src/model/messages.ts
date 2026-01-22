// models/Message.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chat: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  // Add more as needed: imageUrl, fileUrl, messageType ('text'|'image'|'file'), etc.
  readBy: { user: mongoose.Types.ObjectId; readAt: Date }[];  // For read receipts
  deletedFor?: mongoose.Types.ObjectId[];  // Soft delete per user
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  chat: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  readBy: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Critical index: sort by time descending for latest messages first
messageSchema.index({ chat: 1, createdAt: -1 });

// For marking as read
messageSchema.index({ chat: 1, sender:1, "readBy.user": 1 });

export default mongoose.model<IMessage>('Message', messageSchema);