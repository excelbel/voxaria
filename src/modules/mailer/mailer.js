const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

/* =========================
   SEND WELCOME EMAIL
   Sent when someone subscribes
========================= */
async function sendWelcomeEmail(email, name = "") {
  await transporter.sendMail({
    from: `"VOXARIA News" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Welcome to VOXARIA Newsletter!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <div style="background:#007bff;padding:20px;text-align:center;">
          <h1 style="color:#fff;margin:0;">VOXARIA</h1>
        </div>
        <div style="padding:30px;background:#fff;">
          <h2>Welcome${name ? ", " + name : ""}! 🎉</h2>
          <p>Thank you for subscribing to <strong>VOXARIA Newsletter</strong>.</p>
          <p>You'll now receive the latest news from Nigeria and around the world directly in your inbox.</p>
          <p style="margin-top:30px;">Stay informed,<br><strong>The VOXARIA Team</strong></p>
        </div>
        <div style="background:#f4f6f9;padding:15px;text-align:center;font-size:12px;color:#666;">
          © 2026 VOXARIA Blog · Anambra State, Nigeria
        </div>
      </div>
    `
  });
}

/* =========================
   SEND NEWSLETTER
   Sends a post to all subscribers
========================= */
async function sendNewsletter(subscribers, post) {
  const postUrl = `${process.env.BASE_URL}/news/${post.slug}`;

  for (const subscriber of subscribers) {
    try {
      await transporter.sendMail({
        from: `"VOXARIA News" <${process.env.GMAIL_USER}>`,
        to: subscriber.email,
        subject: post.title,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
            <div style="background:#007bff;padding:20px;text-align:center;">
              <h1 style="color:#fff;margin:0;">VOXARIA</h1>
            </div>
            <div style="padding:30px;background:#fff;">
              ${post.thumbnail
                ? `<img src="${post.thumbnail}" style="width:100%;border-radius:6px;margin-bottom:20px;">`
                : ""}
              <span style="background:#dc3545;color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;">
                ${post.category || "News"}
              </span>
              <h2 style="margin-top:12px;">${post.title}</h2>
              <p style="color:#555;line-height:1.7;">
                ${(post.aiSummary || post.content || "").substring(0, 300)}...
              </p>
              <a href="${postUrl}"
                style="display:inline-block;margin-top:20px;background:#007bff;color:#fff;
                       padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                Read Full Story →
              </a>
            </div>
            <div style="background:#f4f6f9;padding:15px;text-align:center;font-size:12px;color:#666;">
              © 2026 VOXARIA Blog · Anambra State, Nigeria<br>
              <a href="${process.env.BASE_URL}/unsubscribe?email=${subscriber.email}"
                style="color:#999;">Unsubscribe</a>
            </div>
          </div>
        `
      });
    } catch (err) {
      console.error(`Newsletter failed for ${subscriber.email}:`, err.message);
    }
  }
}

module.exports = { sendWelcomeEmail, sendNewsletter };