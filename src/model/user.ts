import {Schema, model, Document, HydratedDocument} from 'mongoose'
import validator from 'validator';
import bcrypt from "bcrypt"

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  _confirmPassword?: string;
  active: boolean;
  lastActiveAt: Date;
  lastActiveAgo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>({
    username:{
        type:String,
        trim:true,
        unique: true,
        lowercase: true,
        minlength:[4, "Username min length must be 4 cheracter"],
        maxlength:[32, "Username min length must be 4 cheracter"],
        required:[true, "You have must be username"]
    },
    email:{
        type: String,
        unique:true,
        trim:true,
        required:[true, "Yue have must be email"],
        validate:{
            validator: (email:string)=>validator.isEmail(email),
            message: "Please provide a valid email address"
        }
    },
    password:{
        type:String,
        trim:true,
        required:[true, "Yue have must be password"],
        select:false,
        validate:{
            validator:function(value){
                // Require at least one uppercase, lowercase, number, and special character
                return /[0-9A-Za-z]/.test(value);
            }
        }
    },
    active:{
        type:Boolean,
        default:true
    },
    lastActiveAt: {
        type: Date,
        default: Date.now
  },
  },
{
    timestamps:true,
    toJSON:{virtuals:true},
    toObject: {virtuals:true}
});


// Virtual field confirmPassword set and get
userSchema.virtual('confirmPassword')
  .set(function (this: HydratedDocument<IUser>, value: string) {
    this._confirmPassword = value;
  })
  .get(function (this: HydratedDocument<IUser>) {
    return this._confirmPassword;
  });

// Hash password before saving
userSchema.pre("save", async function (next) {
  const user = this as HydratedDocument<IUser>;

  if (!user.isModified("password")) return next();

  if (user._confirmPassword && user.password !== user._confirmPassword) {
    return next(new Error("Passwords do not match"));
  }

  user.password = await bcrypt.hash(user.password, 12);
  next();
});

//check validate virtual confirmPassword field
userSchema.pre("validate", function(next){
  if(this.isModified("password")){

    if(!this._confirmPassword){
      this.invalidate('confirmPassword', 'Confirm password is required');
    }

    if(this.password !== this._confirmPassword){
      this.invalidate('confirmPassword', 'Passwords do not match');
    }
  }
  next();
})

userSchema.virtual('lastActiveAgo').get(function () {
  if (!this.lastActiveAt) return null;

  const diff = Date.now() - this.lastActiveAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 8) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
});


const User = model('User', userSchema);
export default User;