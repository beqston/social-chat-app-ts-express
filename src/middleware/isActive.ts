import User from "../model/user.ts";

export default function isActive(){
  const INACTIVE_THRESHOLD = 80 * 1000; 
  setInterval(async () => {
    const cutoff = new Date(Date.now() - INACTIVE_THRESHOLD);

    await User.updateMany(
      { lastActiveAt: { $lt: cutoff }, active: true },
      { $set:{active: false} }
    );
  }, 40000); 
}