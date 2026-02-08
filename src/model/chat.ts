// models/Conversation.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];
  deletedBy?:mongoose.Types.ObjectId[];
  isGroup?: boolean;                        
  groupName?: string;                       
  lastMessage?: mongoose.Types.ObjectId;  
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  participants: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    required: true,
    validate: {
      validator: function(v: mongoose.Types.ObjectId[]) {
        // v is now the entire array of IDs
        if (!v || v.length < 2) return false;
        
        const uniqueParticipants = new Set(v.map(id => id.toString()));
        return uniqueParticipants.size === v.length;
      },
      message: 'A chat must have at least 2 unique participants.'
    }
  },
  deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

// Compound index for fast lookup of conversations for a user
chatSchema.index({ participants: 1 });

export default mongoose.model<IChat>('Chat', chatSchema);