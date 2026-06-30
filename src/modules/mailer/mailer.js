const nodemailer = require("nodemailer");
const dns = require("dns");

// Force IPv4 lookups globally
dns.setDefaultResultOrder("ipv4first");

/* =========================
   CUSTOM IPv4-ONLY LOOKUP
   Render's network sometimes ignores family:4
   on its own, so we force it manually here
========================= */
function ipv4Lookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, { family: 4 }, callback);
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  family: 4,
  lookup: ipv4Lookup,
  connectionTimeout: 15000,  // fail fast instead of hanging
  greetingTimeout: 15000,
  socketTimeout: 15000
});
transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP VERIFY ERROR:");
    console.error(err);
  } else {
    console.log("SMTP READY");
  }
});
/* =========================
   SEND WELCOME EMAIL
   Sent to the new subscriber
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
   NOTIFY ADMIN
   Sent to YOU when someone new subscribes
========================= */
async function notifyAdminNewSubscriber(email, name = "") {
  try {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.GMAIL_USER;

    await transporter.sendMail({
      from: `"VOXARIA System" <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `🔔 New Subscriber: ${email}`,
      html: `
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
  } catch (err) {
    console.error("Admin notification failed:", err.message);
  }
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

module.exports = {
  sendWelcomeEmail,
  notifyAdminNewSubscriber,
  sendNewsletter
};