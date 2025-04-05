const nodemailer = require("nodemailer");
const logger = require("./logger");

// Create a transporter
let transporter;

// Initialize the transporter
const initTransporter = () => {
  if (transporter) return;
  
  // For production
  if (process.env.NODE_ENV === "production") {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // For development - use ethereal.email
    nodemailer.createTestAccount().then((testAccount) => {
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info("Test email account created", { 
        user: testAccount.user, 
        url: "https://ethereal.email" 
      });
    });
  }
};

// Send email
exports.sendEmail = async (options) => {
  if (!transporter) {
    initTransporter();
  }
  
  try {
    logger.debug("Sending email", { to: options.to, subject: options.subject });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL in development
    if (process.env.NODE_ENV !== "production") {
      logger.info("Email preview URL", { 
        previewUrl: nodemailer.getTestMessageUrl(info),
        to: options.to
      });
    }
    
    logger.debug("Email sent successfully", { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error("Error sending email:", { 
      error: error.message, 
      stack: error.stack,
      to: options.to
    });
    throw new Error("Failed to send email");
  }
};