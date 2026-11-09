const nodemailer = require('nodemailer');

let transporter = null;
const devEmailOutbox = [];

// Initialize transporter
async function initTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: cleanPass,
      },
    });
    console.log('[EmailService] Using configured SMTP transporter:', process.env.SMTP_HOST);
  } else {
    // Development fallback transporter (Ethereal or mock)
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('[EmailService] SMTP credentials not provided. Initialized Ethereal test mailbox for dev testing:');
      console.log(`  User: ${testAccount.user}`);
    } catch (err) {
      console.warn('[EmailService] Could not connect to Ethereal, using local dev mock transporter:', err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          const preview = {
            messageId: 'mock-' + Date.now(),
            ...mailOptions,
            sentAt: new Date(),
          };
          devEmailOutbox.unshift(preview);
          if (devEmailOutbox.length > 50) devEmailOutbox.pop();
          console.log(`[EmailMock] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          return preview;
        },
      };
    }
  }
}

// Helper to send mail
async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    await initTransporter();
  }

  // For Gmail SMTP, sender must match authenticated user or configured FROM_EMAIL
  const senderEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@sprintsync.io';
  const from = `"${process.env.FROM_NAME || 'SprintSync Team'}" <${senderEmail}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
    const logEntry = {
      messageId: info.messageId,
      to,
      subject,
      sentAt: new Date(),
      previewUrl: previewUrl || null,
      html,
    };
    devEmailOutbox.unshift(logEntry);
    if (devEmailOutbox.length > 50) devEmailOutbox.pop();

    console.log(`[EmailService] Sent to: ${to} | Subject: ${subject}`);
    if (previewUrl) {
      console.log(`  🔗 Email Preview URL: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    // Keep in mock outbox even on transport failure
    devEmailOutbox.unshift({
      to,
      subject,
      error: error.message,
      sentAt: new Date(),
      html,
    });
    return { success: false, error: error.message };
  }
}

/**
 * 1. Employee Confirmation / Invitation Email
 */
async function sendEmployeeInviteEmail(employee, confirmationToken) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const confirmationUrl = `${clientUrl}/confirm-employee?token=${confirmationToken}&email=${encodeURIComponent(employee.email)}`;

  const subject = `🚀 Welcome to SprintSync - Confirm Your Employee Account`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e17; color: #f1f5f9; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #161824; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #6366f1; margin-bottom: 24px; display: inline-block; }
        h1 { font-size: 22px; color: #ffffff; margin-bottom: 12px; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 12px 0; }
        .details-box { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 16px; margin: 20px 0; }
        .details-item { margin: 6px 0; font-size: 14px; color: #cbd5e1; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-weight: 600; text-decoration: none; margin: 20px 0; font-size: 15px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; text-align: center; }
        .link-text { color: #818cf8; word-break: break-all; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">⚡ SprintSync</div>
        <h1>Welcome aboard, ${employee.name}!</h1>
        <p>You have been added to the SprintSync workspace. Please confirm your email address and activate your employee account to start collaborating with your team.</p>
        
        <div class="details-box">
          <div class="details-item"><strong>Role:</strong> ${employee.role}</div>
          <div class="details-item"><strong>Department:</strong> ${employee.department}</div>
          <div class="details-item"><strong>Email:</strong> ${employee.email}</div>
        </div>

        <div style="text-align: center;">
          <a href="${confirmationUrl}" class="btn" target="_blank">Confirm & Activate Account</a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">Or copy and paste this link into your browser:</p>
        <p style="text-align: center;"><a href="${confirmationUrl}" class="link-text">${confirmationUrl}</a></p>

        <div class="footer">
          This invitation was sent by your team on SprintSync. If you did not expect this invitation, you can ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: employee.email, subject, html });
}

/**
 * 2. Task Assignment Alert Email
 */
async function sendTaskAssignmentEmail(employee, task, assignorName = 'Team Lead') {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const taskUrl = `${clientUrl}/board?taskId=${task._id || task.id}`;

  const priorityColor =
    task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981';

  const subject = `🔔 Task Assigned: ${task.title} [${task.priority} Priority]`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e17; color: #f1f5f9; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #161824; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #6366f1; margin-bottom: 24px; display: inline-block; }
        h1 { font-size: 20px; color: #ffffff; margin-bottom: 12px; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 12px 0; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #fff; background: ${priorityColor}; margin-right: 8px; }
        .task-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid ${priorityColor}; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; font-size: 13px; color: #cbd5e1; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; margin: 16px 0; font-size: 14px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">⚡ SprintSync</div>
        <h1>Hi ${employee.name}, a new task was assigned to you!</h1>
        <p><strong>${assignorName}</strong> assigned you to the following task in SprintSync:</p>
        
        <div class="task-box">
          <div style="margin-bottom: 8px;">
            <span class="badge">${task.priority} Priority</span>
            ${task.category ? `<span style="font-size: 11px; color: #818cf8; background: rgba(99,102,241,0.15); padding: 4px 10px; border-radius: 20px;">${task.category}</span>` : ''}
          </div>
          <h2 style="font-size: 18px; color: #fff; margin: 8px 0;">${task.title}</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 12px 0;">${task.description || 'No description provided.'}</p>
          
          <div class="meta-grid">
            <div>📅 <strong>Due Date:</strong> ${task.dueDate || 'No due date'}</div>
            <div>⚡ <strong>Story Points:</strong> ${task.storyPoints || 3}</div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${taskUrl}" class="btn" target="_blank">View Task on Board</a>
        </div>

        <div class="footer">
          SprintSync Real-time Task Management System. Stay in sync, ship faster.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: employee.email, subject, html });
}

module.exports = {
  sendMail,
  sendEmployeeInviteEmail,
  sendTaskAssignmentEmail,
  getDevEmailOutbox: () => devEmailOutbox,
};

