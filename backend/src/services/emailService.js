'use strict';

const nodemailer = require('nodemailer');

// Initialize email transporter with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send welcome email to new user after signup
 * Email design matches Bakàl brand colors and style
 * 
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's full name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendWelcomeEmail(userEmail, userName) {
  try {
    // Extract first name only if full name provided
    const firstName = userName ? userName.split(' ')[0] : 'User';

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: userEmail,
      subject: '🎉 Welcome to Bakàl – Your PC Price Comparison Platform!',
      html: generateWelcomeEmailHTML(firstName),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${userEmail} - Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML for welcome email
 * Uses Bakàl brand colors: primary gradient (#0a1a3a → #806286), accent gold
 * 
 * @param {string} firstName - User's first name
 * @returns {string} HTML email body
 */
function generateWelcomeEmailHTML(firstName) {
  const currentYear = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || 'https://bakal.app';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Bakàl</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #0a1a3a 0%, #806286 100%);
          padding: 40px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          position: relative;
          z-index: 1;
        }
        .content {
          padding: 40px 30px;
          color: #1f2937;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #0a1a3a;
          margin: 0 0 20px 0;
        }
        .intro-text {
          font-size: 14px;
          line-height: 1.6;
          color: #4b5563;
          margin: 0 0 25px 0;
        }
        .feature-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
          border-left: 4px solid #806286;
        }
        .feature-section h3 {
          margin: 0 0 15px 0;
          color: #0a1a3a;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }
        .feature-section h3::before {
          content: '';
          display: inline-block;
          width: 24px;
          height: 24px;
          margin-right: 10px;
          background: linear-gradient(135deg, #0a1a3a 0%, #806286 100%);
          border-radius: 4px;
        }
        .store-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .store-item {
          padding: 8px 0;
          font-size: 13px;
          color: #4b5563;
          border-bottom: 1px solid #e5e7eb;
        }
        .store-item:last-child {
          border-bottom: none;
        }
        .store-name {
          font-weight: 600;
          color: #0a1a3a;
        }
        .store-desc {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        .cta-button {
          display: block;
          background: linear-gradient(135deg, #0a1a3a 0%, #806286 100%);
          color: #ffffff;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          text-align: center;
          margin: 30px 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 15px rgba(10, 26, 58, 0.2);
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10, 26, 58, 0.3);
        }
        .next-steps {
          background: #efe8f1;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .next-steps h4 {
          margin: 0 0 10px 0;
          color: #0a1a3a;
          font-size: 14px;
          font-weight: 600;
        }
        .next-steps ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
          font-size: 13px;
        }
        .next-steps li {
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .footer {
          background: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }
        .footer-links {
          margin-top: 10px;
          font-size: 11px;
        }
        .footer-links a {
          color: #806286;
          text-decoration: none;
          margin: 0 8px;
        }
        .divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 25px 0;
        }
        .accent-gold {
          color: #d4af37;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header with gradient -->
        <div class="header">
          <h1>🎉 Welcome to Bakàl!</h1>
          <p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 14px; position: relative; z-index: 1;">Your AI-powered PC price comparison platform</p>
        </div>

        <!-- Main Content -->
        <div class="content">
          <p class="greeting">Hi ${firstName}! 👋</p>
          
          <p class="intro-text">
            We're thrilled to have you on board! Bakàl is your go-to platform for comparing PC prices across your favorite retailers. Get real-time pricing, detailed specs, and smart recommendations—all in one place.
          </p>

          <!-- Feature Highlight -->
          <div class="feature-section">
            <h3>Compare Across Top Stores</h3>
            <ul class="store-list">
              <li class="store-item">
                <span class="store-name">💻 PCExpress</span>
                <div class="store-desc">Latest laptops, desktops & peripherals</div>
              </li>
              <li class="store-item">
                <span class="store-name">🎮 VillMan</span>
                <div class="store-desc">Gaming powerhouses & performance builds</div>
              </li>
              <li class="store-item">
                <span class="store-name">💰 PCWorx</span>
                <div class="store-desc">Budget-friendly options & great deals</div>
              </li>
            </ul>
          </div>

          <!-- Main CTA Button -->
          <center>
            <a href="${frontendUrl}/home" class="cta-button">
              Start Browsing Now →
            </a>
          </center>

          <!-- Next Steps -->
          <div class="next-steps">
            <h4>📋 What You Can Do Next</h4>
            <ul>
              <li>Search for any PC component (GPU, CPU, RAM, etc.)</li>
              <li>Compare prices and specs side-by-side</li>
              <li>Get AI-powered product recommendations</li>
              <li>Save items to your personal collection</li>
              <li>Receive updates on price changes</li>
            </ul>
          </div>

          <p class="intro-text" style="margin-top: 25px;">
            Have questions? Feel free to reach out to our support team anytime. We're here to help you find the perfect PC at the best price.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p class="footer-text">
            © ${currentYear} <strong>Bakàl</strong> — Your AI-Powered PC Price Comparison Platform<br>
            Helping you find the perfect computer at the perfect price
          </p>
          <div class="footer-links">
            <a href="${frontendUrl}/help">Help Center</a>
            <a href="${frontendUrl}/privacy">Privacy Policy</a>
            <a href="${frontendUrl}/terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = { sendWelcomeEmail };
