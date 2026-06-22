import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS,
  },
});

export async function sendApiLimitAlert(providerName: string, requestsUsed: number, maxLimit: number) {
  console.log("DEBUG: EMAIL FUNCTION REACHED FOR PROVIDER:", providerName);
  const percentage = Math.round((requestsUsed / maxLimit) * 100);
  
  const mailOptions = {
    from: `"OSHunt Monitor" <${process.env.ALERT_EMAIL_USER}>`,
    to: process.env.NOTIFICATION_RECEIVER,
    subject: `⚠️ WARNING: AI API Limit Reached 80% - ${providerName}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #dc2626;">⚠️ API Limit Alert</h2>
        <p>Your multi-LLM routing engine detected that an API provider has almost exhausted its free tier capacity.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p><strong>Provider:</strong> ${providerName}</p>
        <p><strong>Usage:</strong> ${requestsUsed} / ${maxLimit} requests (${percentage}%)</p>
        <p style="color: #4b5563; font-size: 14px;">OSHunt will automatically route traffic to secondary backup models, but you should refresh or swap this key soon to ensure full fallback capacity.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[ALERT] Email alert successfully dispatched for ${providerName}`);
  } catch (error) {
    console.error("[ALERT_ERROR] Failed to send email alert via Gmail:", error);
  }
}