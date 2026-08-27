import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load env vars FIRST before reading them
dotenv.config();

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
let smtpPass = process.env.SMTP_PASS;

// Fix: Remove spaces from password (common .env issue)
if (smtpPass) {
  smtpPass = smtpPass.replace(/\s+/g, '');
}

console.log('📧 Email Service Config:', {
  host: smtpHost,
  port: smtpPort,
  user: smtpUser ? `${smtpUser.substring(0, 3)}***` : 'NOT SET',
  pass: smtpPass ? 'SET' : 'NOT SET',
  passLength: smtpPass ? smtpPass.length : 0,
});

if (!smtpUser || !smtpPass || smtpUser.includes('your') || smtpPass.includes('your')) {
  console.warn('⚠️  SMTP credentials not configured! Using placeholder values. Emails will NOT be sent.');
  console.warn('   Update backend/.env with real SMTP credentials.');
}

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
    } : undefined,
    debug: true,
    logger: true,
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Transporter verification failed:', error.message);
    console.error('   Check your SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in backend/.env');
  } else {
    console.log('✅ SMTP Transporter ready - emails can be sent');
  }
});

export async function sendInvoiceEmail(user, plan, paymentDetails) {
    const planConfig = {
        free: { name: 'Free', price: 0 },
        bronze: { name: 'Bronze', price: 100 },
        silver: { name: 'Silver', price: 300 },
        gold: { name: 'Gold', price: 1000 },
    };

    const planInfo = planConfig[plan] || planConfig.free;
    const invoiceNumber = `INV-${Date.now()}-${user._id.toString().slice(-6)}`;
    const date = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Twitter Clone</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Subscription Invoice</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e1e8ed; border-top: none;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px;">Invoice Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Invoice Number</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoiceNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Date</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Customer</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${user.displayName} (${user.email})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Plan</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${planInfo.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Amount</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1da1f2;">\u20B9${planInfo.price.toLocaleString('en-IN')}</td>
                    </tr>
                </table>
            </div>

            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 18px;">Plan Features</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1a1a1a;">
                    ${getPlanFeatures(plan).map(f => `<li style="margin-bottom: 8px;">${f}</li>`).join('')}
                </ul>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404;"><strong>Note:</strong> Payments are only processed between 10:00 AM - 11:00 AM IST. Your subscription will be activated once payment is confirmed during this window.</p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e1e8ed;">
                <p style="color: #657786; font-size: 14px; margin: 0;">Thank you for choosing Twitter Clone!</p>
                <p style="color: #657786; font-size: 12px; margin: 10px 0 0;">This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
Invoice Number: ${invoiceNumber}
Date: ${date}
Customer: ${user.displayName} (${user.email})
Plan: ${planInfo.name}
Amount: \u20B9${planInfo.price.toLocaleString('en-IN')}

Plan Features:
${getPlanFeatures(plan).map(f => `- ${f}`).join('\n')}

Note: Payments are only processed between 10:00 AM - 11:00 AM IST.

Thank you for choosing Twitter Clone!
    `;

    try {
        await transporter.sendMail({
            from: `"Twitter Clone" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `Invoice #${invoiceNumber} - ${planInfo.name} Plan Subscription`,
            text,
            html,
        });
        console.log(`Invoice email sent to ${user.email}`);
    } catch (error) {
        console.error('Failed to send invoice email:', error);
        throw error;
    }
}

function getPlanFeatures(plan) {
    const features = {
        free: ['1 tweet per month', 'Basic profile', 'View tweets'],
        bronze: ['3 tweets per month', 'Basic profile', 'View tweets', 'Priority support'],
        silver: ['5 tweets per month', 'Enhanced profile', 'View tweets', 'Priority support', 'Analytics'],
        gold: ['Unlimited tweets', 'Premium profile', 'View tweets', '24/7 Support', 'Advanced Analytics', 'Verified badge'],
    };
    return features[plan] || features.free;
}

export async function sendPaymentConfirmationEmail(user, plan, paymentId) {
    const planConfig = {
        bronze: { name: 'Bronze', price: 100 },
        silver: { name: 'Silver', price: 300 },
        gold: { name: 'Gold', price: 1000 },
    };

    const planInfo = planConfig[plan];
    if (!planInfo) return;

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Twitter Clone</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Payment Confirmed!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e1e8ed; border-top: none;">
            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                <div style="width: 80px; height: 80px; background: #1da1f2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h2 style="margin: 0 0 10px; color: #1a1a1a;">Payment Successful!</h2>
                <p style="color: #657786; margin: 0;">Your ${planInfo.name} plan is now active.</p>
            </div>

            <div style="background: white; padding: 25px; border-radius: 8px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px; color: #1a1a1a;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #657786;">Plan</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${planInfo.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786;">Amount Paid</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1da1f2;">\u20B9${planInfo.price.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786;">Payment ID</td>
                        <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${paymentId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786;">Status</td>
                        <td style="padding: 8px 0; text-align: right; color: #17bf63; font-weight: 600;">Completed</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; padding-top: 20px;">
                <p style="color: #657786; font-size: 14px; margin: 0;">Enjoy your ${planInfo.name} benefits!</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"Twitter Clone" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `Payment Confirmed - ${planInfo.name} Plan Activated`,
            html,
        });
    } catch (error) {
        console.error('Failed to send payment confirmation email:', error);
    }
}

export async function sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const date = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Twitter Clone</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Password Reset Request</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e1e8ed; border-top: none;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px;">Reset Your Password</h2>
                <p style="color: #1a1a1a; margin: 0 0 15px;">Hi ${user.displayName},</p>
                <p style="color: #1a1a1a; margin: 0 0 15px;">You requested a password reset for your Twitter Clone account. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: #1da1f2; color: white; padding: 14px 30px; border-radius: 30px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #657786; font-size: 14px; margin: 0;">Or copy and paste this link into your browser:</p>
                <p style="color: #1da1f2; font-size: 13px; word-break: break-all; margin: 5px 0 0;">${resetUrl}</p>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404;"><strong>Important:</strong> This link expires in 1 hour. You can only request a password reset once per day.</p>
            </div>

            <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 16px;">Security Tips</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1a1a1a; font-size: 14px;">
                    <li style="margin-bottom: 8px;">Never share your password or reset link with anyone</li>
                    <li style="margin-bottom: 8px;">Use a unique password you don't use on other sites</li>
                    <li style="margin-bottom: 8px;">Your new password will contain only letters (uppercase and lowercase)</li>
                </ul>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e1e8ed;">
                <p style="color: #657786; font-size: 14px; margin: 0;">If you didn't request this, please ignore this email.</p>
                <p style="color: #657786; font-size: 12px; margin: 10px 0 0;">This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
Hi ${user.displayName},

You requested a password reset for your Twitter Clone account.

Reset your password here: ${resetUrl}

Important: This link expires in 1 hour. You can only request a password reset once per day.

Security Tips:
- Never share your password or reset link with anyone
- Use a unique password you don't use on other sites
- Your new password will contain only letters (uppercase and lowercase)

If you didn't request this, please ignore this email.

Thank you for choosing Twitter Clone!
    `;

    try {
        if (!smtpUser || !smtpPass || smtpUser.includes('your') || smtpPass.includes('your')) {
            throw new Error('SMTP credentials not configured. Please update backend/.env with real SMTP credentials.');
        }
        
        const info = await transporter.sendMail({
            from: `"Twitter Clone" <${smtpUser}>`,
            to: user.email,
            subject: `Password Reset Request - Twitter Clone`,
            text,
            html,
        });
        console.log(`✅ Password reset email sent to ${user.email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
        console.error('❌ Failed to send password reset email:');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Command:', error.command);
        console.error('   Response:', error.response);
        console.error('   Response Code:', error.responseCode);
        throw error;
    }
}

export function generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const allChars = uppercase + lowercase;
    
    let password = '';
    
    // Ensure at least one uppercase and one lowercase
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    
    // Fill the rest
    for (let i = 2; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function sendOTPEmail(user, otp, deviceInfo) {
    const date = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const time = new Date().toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Twitter Clone</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Login Verification Code</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e1e8ed; border-top: none;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px;">Your OTP Code</h2>
                <p style="color: #1a1a1a; margin: 0 0 15px;">Hi ${user.displayName},</p>
                <p style="color: #1a1a1a; margin: 0 0 15px;">You're logging in from a new device. Enter the code below to verify your identity:</p>
                <div style="background: #f0f8ff; border: 2px dashed #1da1f2; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1da1f2; font-family: monospace;">${otp}</span>
                </div>
                <p style="color: #657786; font-size: 14px; margin: 0;">This code expires in 10 minutes.</p>
            </div>

            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 16px;">Login Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Browser</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${deviceInfo.browser}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Operating System</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${deviceInfo.os}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Device Type</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; text-transform: capitalize;">${deviceInfo.deviceType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">IP Address</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace; font-size: 12px;">${deviceInfo.ipAddress}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #657786; font-weight: 500;">Date & Time</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600;">${date} at ${time}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404;"><strong>Security Note:</strong> If you didn't attempt this login, please ignore this email and consider changing your password immediately.</p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e1e8ed;">
                <p style="color: #657786; font-size: 14px; margin: 0;">This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
Hi ${user.displayName},

Your OTP code for Twitter Clone login: ${otp}

Login Details:
- Browser: ${deviceInfo.browser}
- OS: ${deviceInfo.os}
- Device: ${deviceInfo.deviceType}
- IP: ${deviceInfo.ipAddress}
- Time: ${date} at ${time}

This code expires in 10 minutes.

If you didn't attempt this login, please ignore this email and consider changing your password.

Thank you for choosing Twitter Clone!
    `;

    try {
        if (!smtpUser || !smtpPass || smtpUser.includes('your') || smtpPass.includes('your')) {
            throw new Error('SMTP credentials not configured');
        }
        
        const info = await transporter.sendMail({
            from: `"Twitter Clone" <${smtpUser}>`,
            to: user.email,
            subject: `Login Verification Code - Twitter Clone`,
            text,
            html,
        });
        console.log(`✅ OTP email sent to ${user.email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Failed to send OTP email:');
        console.error('   Error:', error.message);
        throw error;
    }
}

export async function sendAudioTweetOTPEmail(user, otp) {
    const date = new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const time = new Date().toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Twitter Clone</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Audio Tweet Verification Code</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e1e8ed; border-top: none;">
            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px;">Your OTP Code</h2>
                <p style="color: #1a1a1a; margin: 0 0 15px;">Hi ${user.displayName},</p>
                <p style="color: #1a1a1a; margin: 0 0 15px;">You're trying to post an audio tweet. Enter the code below to verify your identity:</p>
                <div style="background: #f5f0ff; border: 2px dashed #8b5cf6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #8b5cf6; font-family: monospace;">${otp}</span>
                </div>
                <p style="color: #657786; font-size: 14px; margin: 0;">This code expires in 10 minutes.</p>
            </div>

            <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 15px; color: #1a1a1a; font-size: 16px;">Important Reminders</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1a1a1a; font-size: 14px;">
                    <li style="margin-bottom: 8px;">Audio tweets only allowed between 2:00 PM - 7:00 PM IST</li>
                    <li style="margin-bottom: 8px;">Maximum duration: 5 minutes</li>
                    <li style="margin-bottom: 8px;">Maximum file size: 100 MB</li>
                    <li style="margin-bottom: 8px;">Supported formats: MP3, WAV, M4A, OGG</li>
                </ul>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404;"><strong>Security Note:</strong> If you didn't attempt to post an audio tweet, please ignore this email and consider changing your password immediately.</p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e1e8ed;">
                <p style="color: #657786; font-size: 14px; margin: 0;">This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
Hi ${user.displayName},

Your OTP code for Twitter Clone audio tweet: ${otp}

Important Reminders:
- Audio tweets only allowed between 2:00 PM - 7:00 PM IST
- Maximum duration: 5 minutes
- Maximum file size: 100 MB
- Supported formats: MP3, WAV, M4A, OGG

This code expires in 10 minutes.

If you didn't attempt to post an audio tweet, please ignore this email and consider changing your password.

Thank you for choosing Twitter Clone!
    `;

    try {
        if (!smtpUser || !smtpPass || smtpUser.includes('your') || smtpPass.includes('your')) {
            throw new Error('SMTP credentials not configured');
        }
        
        const info = await transporter.sendMail({
            from: `"Twitter Clone" <${smtpUser}>`,
            to: user.email,
            subject: `Audio Tweet Verification Code - Twitter Clone`,
            text,
            html,
        });
        console.log(`✅ Audio tweet OTP email sent to ${user.email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
    } catch (error) {
        console.error('❌ Failed to send audio tweet OTP email:');
        console.error('   Error:', error.message);
        throw error;
    }
}