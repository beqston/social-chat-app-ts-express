// inactivityTask.ts
import User from "../model/user.ts";

export default function isActive() {

  const INACTIVE_THRESHOLD = 7 * 60 * 1000; 
  const CHECK_INTERVAL = 2 * 60 * 1000; 

  const runCleanup = async () => {
    try {
      const cutoff = new Date(Date.now() - INACTIVE_THRESHOLD);

      await User.updateMany(
        { lastActiveAt: { $lt: cutoff }, active: true },
        { $set: { active: false } }
      );
    } catch (error) {
      console.error("Cleanup Error:", error);
    } finally {
      setTimeout(runCleanup, CHECK_INTERVAL);
    }
  };
  runCleanup();
}