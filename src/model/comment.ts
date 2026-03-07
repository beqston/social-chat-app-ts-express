import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  text: string;
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
    text:{
        type:String,
        required:true,
        trim:true,
        minlength: [1, "Comment must be at least 1 character"],
        maxlength: [300, "Comment cannot exceed 300 characters"]
    },
    user:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required: [true, "Comment must belong to a user"],
    },
    post:{
        type:Schema.Types.ObjectId,
        ref:"Post",
        required: [true, "Comment must belong to a post"],
    }
},
{
    timestamps:true,
    versionKey:false
});

commentSchema.index({post: 1, createdAt:-1});

const Comment:Model<IComment> = mongoose.model<IComment>("Comment", commentSchema);

export default Comment;
