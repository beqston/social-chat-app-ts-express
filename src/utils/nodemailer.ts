import nodemailer from "nodemailer";

export default async function SendEmail(email:string, resetURL:string){
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'bako.rap@gmail.com',
      pass: process.env.MAIL_PASSWORD
    }
  });

    // Send email
    const mailOptions = {
      from: 'your@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      text: "You Can reset password in this link", 
          html: `
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the link below:</p>
            <a href="${resetURL}" style="padding:10px 20px; background:#4F46E5; color:white; border-radius:5px; text-decoration:none;">
              Reset Password
            </a>
            <p>This link expires in <strong>10 minutes</strong>.</p>
            <p>If you didn't request this, ignore this email.</p>
          `
      }
      await transporter.sendMail(mailOptions);
};