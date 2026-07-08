const { BrevoClient } = require("@getbrevo/brevo");

/* =========================
   BREVO CLIENT SETUP
========================= */
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
});

const SENDER = {
  email: process.env.BREVO_SENDER_EMAIL,
  name: "VOXARIA News"
};

/* =========================
   SEND WELCOME EMAIL
========================= */
async function sendWelcomeEmail(email, name = "") {
  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender: SENDER,
      to: [{ email, name: name || email }],
      subject: "Welcome to VOXARIA Newsletter!",
      htmlContent: `
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
    console.log("Welcome email sent to:", email);
  } catch (err) {
    console.error("Welcome email failed:", err.response?.body || err.message);
    throw err;
  }
}

/* =========================
   NOTIFY ADMIN
========================= */
async function notifyAdminNewSubscriber(email, name = "") {
  try {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.BREVO_SENDER_EMAIL;

    await brevo.transactionalEmails.sendTransacEmail({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: "VOXARIA System" },
      to: [{ email: adminEmail }],
      subject: `🔔 New Subscriber: ${email}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
          <div style="background:#28a745;padding:18px;text-align:center;">
            <h2 style="color:#fff;margin:0;">New Newsletter Subscriber</h2>
          </div>
          <div style="padding:24px;background:#fff;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Name:</strong> ${name || "Not provided"}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</p>
            <a href="${process.env.BASE_URL}/admin/subscribers"
              style="display:inline-block;margin-top:14px;background:#007bff;color:#fff;
                     padding:10px 20px;border-radius:6px;text-decoration:none;">
              View All Subscribers
            </a>
          </div>
        </div>
      `
    });
    console.log("Admin notification sent for:", email);
  } catch (err) {
    console.error("Admin notification failed:", err.response?.body || err.message);
  }
}

/* =========================
   SEND NEWSLETTER
========================= */
async function sendNewsletter(subscribers, post) {
  const postUrl = `${process.env.BASE_URL}/news/${post.slug}`;

  for (const subscriber of subscribers) {
    try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: SENDER,
        to: [{ email: subscriber.email, name: subscriber.name || subscriber.email }],
        subject: post.title,
        htmlContent: `
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
      console.log("Newsletter sent to:", subscriber.email);
    } catch (err) {
      console.error(`Newsletter failed for ${subscriber.email}:`, err.response?.body || err.message);
    }
  }
}

module.exports = {
  notifyAdminNewMessage,
  sendWelcomeEmail,
  notifyAdminNewSubscriber,
  sendNewsletter
};


/* =========================
   NOTIFY ADMIN — NEW CONTACT MESSAGE
========================= */
async function notifyAdminNewMessage(name, email, subject, message) {
  try {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.BREVO_SENDER_EMAIL;

    await brevo.transactionalEmails.sendTransacEmail({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: "VOXARIA System" },
      to: [{ email: adminEmail }],
      subject: `📩 New Contact Message: ${subject || "No subject"}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
          <div style="background:#0f2027;padding:18px;text-align:center;">
            <h2 style="color:#ffd700;margin:0;">📩 New Contact Message</h2>
          </div>
          <div style="padding:24px;background:#fff;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Subject:</strong> ${subject || "Not specified"}</p>
            <p><strong>Message:</strong></p>
            <p style="background:#f5f5f5;padding:14px;border-radius:6px;white-space:pre-wrap;">${message}</p>
            <a href="${process.env.BASE_URL}/admin/messages"
              style="display:inline-block;margin-top:14px;background:#007bff;color:#fff;
                     padding:10px 20px;border-radius:6px;text-decoration:none;">
              View All Messages
            </a>
          </div>
          <div style="background:#f4f6f9;padding:12px;text-align:center;font-size:12px;color:#666;">
            © 2026 VOXARIA Blog · Anambra State, Nigeria
          </div>
        </div>
      `
    });
    console.log("Contact notification sent for:", email);
  } catch (err) {
    console.error("Contact notification failed:", err.response?.body || err.message);
  }
}
