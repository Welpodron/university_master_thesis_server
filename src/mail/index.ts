import nodemailer from 'nodemailer';

export default nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_SMTP_USER,
    pass: process.env.MAIL_SMTP_PASS,
  },
});
