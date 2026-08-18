import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const PLAN_DETAILS: Record<string, { name: string; price: number }> = {
  free: { name: "Free", price: 0 },
  bronze: { name: "Bronze", price: 100 },
  silver: { name: "Silver", price: 300 },
  gold: { name: "Gold", price: 1000 },
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email, plan, amount, razorpayOrderId, razorpayPaymentId } = await req.json();

    const planInfo = PLAN_DETAILS[plan];
    const invoiceNumber = `INV-${Date.now()}`;
    const date = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { font-size: 32px; font-weight: bold; color: #1da1f2; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #666; }
          .value { font-weight: 600; }
          .plan-badge { display: inline-block; background: #1da1f2; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
          .amount { font-size: 24px; font-weight: bold; color: #1a1a1a; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">X</div>
          <h1>Subscription Invoice</h1>
        </div>
        <div class="content">
          <p>Thank you for your subscription!</p>
          
          <div class="invoice-details">
            <div class="detail-row">
              <span class="label">Invoice Number</span>
              <span class="value">${invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date</span>
              <span class="value">${date}</span>
            </div>
            <div class="detail-row">
              <span class="label">Plan</span>
              <span class="value"><span class="plan-badge">${planInfo.name}</span></span>
            </div>
            <div class="detail-row">
              <span class="label">Amount Paid</span>
              <span class="value amount">\u20B9${amount}</span>
            </div>
            <div class="detail-row">
              <span class="label">Razorpay Order ID</span>
              <span class="value">${razorpayOrderId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Razorpay Payment ID</span>
              <span class="value">${razorpayPaymentId}</span>
            </div>
          </div>

          <h3>Plan Benefits</h3>
          <ul>
            ${plan === "free" ? "<li>1 tweet per month</li>" : ""}
            ${plan === "bronze" ? "<li>3 tweets per month</li><li>No ads</li>" : ""}
            ${plan === "silver" ? "<li>5 tweets per month</li><li>No ads</li><li>Analytics</li>" : ""}
            ${plan === "gold" ? "<li>Unlimited tweets</li><li>No ads</li><li>Analytics</li><li>Priority support</li>" : ""}
          </ul>

          <div class="footer">
            <p>This is an automated invoice. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} X Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"X Clone" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invoice for ${planInfo.name} Plan Subscription - ${invoiceNumber}`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return NextResponse.json(
      { error: "Failed to send invoice email" },
      { status: 500 }
    );
  }
}