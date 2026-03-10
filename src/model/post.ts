import mongoose, {Schema, Document, Model} from "mongoose";

interface IPost  extends Document {
    text?: string;
    image?: string,
    user: mongoose.Types.ObjectId;
    likeCount: number;
    createdAt: Date;
    updatedAt: Date,
    likes:mongoose.Types.ObjectId[]
}

const postSchema = new Schema<IPost>({
    text:{
        type: String,
        trim: true,
        minlength: [1, "Post text must be at least 1 character"],
        maxlength: [2000, "Post text cannot exceed 2000 characters"],
    },
    image:String,
    user:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required: [true, "Post must belong to a user"],
    },
    likes: [{
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    }]
},
{
    timestamps: true,
    toJSON:{virtuals:true},
    versionKey:false
})

postSchema.index({ user: 1, createdAt: -1 }); 
// chek if exist text or image
postSchema.pre("validate", function (next) {
  if (!this.text && !this.image) {
    return next(new Error("Post must have either text or an image"));
  } 
  next();
});

// get count of likes
postSchema.virtual("likeCount").get(function(){
    return this.likes.length;
});

const Post: Model<IPost> = mongoose.model<IPost>("Post", postSchema);
export default Post;
