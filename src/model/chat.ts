// models/Conversation.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];  // Array of User IDs (2 for private, more for groups)
  isGroup?: boolean;                        // Optional flag if you need to distinguish
  groupName?: string;                       // For group chats
  lastMessage?: mongoose.Types.ObjectId;    // Denormalized: ref to latest message (for quick inbox view)
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    minlength: 2  // At least 2 users
  }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

// Compound index for fast lookup of conversations for a user
chatSchema.index({ participants: 1 });

export default mongoose.model<IChat>('Chat', chatSchema);