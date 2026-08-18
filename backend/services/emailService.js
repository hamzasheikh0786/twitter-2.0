import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
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
        await transporter.sendMail({
            from: `"Twitter Clone" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `Password Reset Request - Twitter Clone`,
            text,
            html,
        });
        console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
        console.error('Failed to send password reset email:', error);
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