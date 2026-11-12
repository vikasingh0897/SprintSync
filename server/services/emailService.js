const nodemailer = require('nodemailer');

let transporter = null;
const devEmailOutbox = [];

function getSenderInfo() {
  const email =
    (process.env.BREVO_SENDER_EMAIL ||
      process.env.FROM_EMAIL ||
      process.env.SMTP_USER ||
      'no-reply@sprintsync.io').trim();
  const name = (process.env.FROM_NAME || 'SprintSync Team').replace(/^["']|["']$/g, '').trim();
  return { name, email };
}

function getEmailProviderInfo() {
  if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) {
    return { provider: 'brevo-api', sender: getSenderInfo() };
  }
  if ((process.env.BREVO_SMTP_USER || process.env.SMTP_USER) && (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS)) {
    const host = process.env.SMTP_HOST || (process.env.BREVO_SMTP_KEY ? 'smtp-relay.brevo.com' : 'smtp.gmail.com');
    return { provider: host.includes('brevo') ? 'brevo-smtp' : 'smtp', host, sender: getSenderInfo() };
  }
  return { provider: 'ethereal-dev', sender: getSenderInfo() };
}

// Initialize Nodemailer transporter (Brevo SMTP or configured SMTP or Ethereal dev fallback)
async function initTransporter() {
  const smtpUser = (process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const smtpHost = process.env.SMTP_HOST || (process.env.BREVO_SMTP_KEY ? 'smtp-relay.brevo.com' : 'smtp.gmail.com');
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    console.log(`[EmailService] Initialized SMTP transporter (${smtpHost}:${smtpPort}) as ${smtpUser}`);
  } else {
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
      console.log('[EmailService] No Brevo/SMTP credentials configured. Initialized Ethereal test mailbox:');
      console.log(`  User: ${testAccount.user}`);
    } catch (err) {
      console.warn('[EmailService] Could not connect to Ethereal, using local dev mock outbox:', err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          const preview = {
            messageId: 'mock-' + Date.now(),
            ...mailOptions,
            sentAt: new Date(),
          };
          console.log(`[EmailMock] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          return preview;
        },
      };
    }
  }
}

/**
 * Send email via Brevo Transactional HTTP API v3 (https://api.brevo.com/v3/smtp/email)
 * Uses HTTPS port 443 so it never gets blocked by cloud/Render SMTP port restrictions.
 */
async function sendViaBrevoApi({ toList, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY.trim();
  const sender = getSenderInfo();

  const payload = {
    sender: { name: sender.name, email: sender.email },
    to: toList,
    subject,
    htmlContent: html,
    textContent: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Brevo API HTTP ${response.status}`);
  }

  return { messageId: data.messageId || `brevo-${Date.now()}` };
}

/**
 * Unified mail sender (prefers Brevo HTTP API if BREVO_API_KEY is set, otherwise Brevo SMTP / Nodemailer)
 */
async function sendMail({ to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = [...new Set(recipients.map((r) => (typeof r === 'string' ? r.trim() : r?.email?.trim())).filter(Boolean))];

  if (cleanRecipients.length === 0) {
    return { success: false, error: 'No recipient email address provided' };
  }

  const toObjects = cleanRecipients.map((email) => ({ email }));
  const plainText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Try Brevo Transactional HTTP API first if BREVO_API_KEY is present
  if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) {
    try {
      const info = await sendViaBrevoApi({ toList: toObjects, subject, html, text: plainText });
      const logEntry = {
        provider: 'brevo-api',
        messageId: info.messageId,
        to: cleanRecipients.join(', '),
        subject,
        sentAt: new Date(),
        previewUrl: null,
        html,
      };
      devEmailOutbox.unshift(logEntry);
      if (devEmailOutbox.length > 50) devEmailOutbox.pop();

      console.log(`[EmailService] Sent via Brevo API to: ${logEntry.to} | Subject: ${subject} | ID: ${info.messageId}`);
      return { success: true, provider: 'brevo-api', messageId: info.messageId, previewUrl: null };
    } catch (brevoErr) {
      console.error(`[EmailService] Brevo API send failed:`, brevoErr.message);
      // Only fall through to SMTP if SMTP creds exist; otherwise return error
      const hasSmtp = (process.env.BREVO_SMTP_USER || process.env.SMTP_USER) && (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS);
      if (!hasSmtp) {
        devEmailOutbox.unshift({ provider: 'brevo-api', to: cleanRecipients.join(', '), subject, error: brevoErr.message, sentAt: new Date(), html });
        return { success: false, provider: 'brevo-api', error: brevoErr.message };
      }
    }
  }

  // 2. Brevo SMTP / Configured SMTP / Ethereal fallback
  if (!transporter) {
    await initTransporter();
  }

  const sender = getSenderInfo();
  const from = `"${sender.name}" <${sender.email}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: cleanRecipients.join(', '),
      subject,
      text: plainText,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
    const logEntry = {
      provider: getEmailProviderInfo().provider,
      messageId: info.messageId,
      to: cleanRecipients.join(', '),
      subject,
      sentAt: new Date(),
      previewUrl: previewUrl || null,
      html,
    };
    devEmailOutbox.unshift(logEntry);
    if (devEmailOutbox.length > 50) devEmailOutbox.pop();

    console.log(`[EmailService] Sent to: ${logEntry.to} | Subject: ${subject}`);
    if (previewUrl) {
      console.log(`  🔗 Email Preview URL: ${previewUrl}`);
    }

    return { success: true, provider: logEntry.provider, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${cleanRecipients.join(', ')}:`, error.message);
    devEmailOutbox.unshift({
      to: cleanRecipients.join(', '),
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
          This invitation was sent via SprintSync. If you did not expect this invitation, you can ignore this email.
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

/**
 * 3. Sprint End / Completion Summary Email
 */
async function sendSprintEndedEmail(recipients, sprint, stats = {}) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const boardUrl = `${clientUrl}/board`;
  const reportsUrl = `${clientUrl}/reports`;

  const totalTasks = stats.totalTasks || 0;
  const completedTasks = stats.completedTasks || 0;
  const inProgressTasks = stats.inProgressTasks || 0;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const startStr = sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : '—';
  const endStr = sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : '—';

  const subject = `🏁 Sprint Ended: ${sprint.name} (${completionPct}% Completed)`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e17; color: #f1f5f9; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #161824; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #6366f1; margin-bottom: 20px; display: inline-block; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #c4b5fd; background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.35); margin-bottom: 12px; }
        h1 { font-size: 22px; color: #ffffff; margin: 8px 0 10px 0; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 10px 0; }
        .stats-grid { display: table; width: 100%; border-spacing: 10px 0; margin: 20px -10px; }
        .stat-box { display: table-cell; width: 33.3%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; text-align: center; }
        .stat-val { font-size: 22px; font-weight: 800; color: #ffffff; }
        .stat-lbl { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; padding: 12px 26px; border-radius: 10px; font-weight: 600; text-decoration: none; margin: 16px 6px; font-size: 14px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">⚡ SprintSync</div>
        <div><span class="badge">Sprint Iteration Ended</span></div>
        <h1>${sprint.name} has concluded!</h1>
        <p>${sprint.goal ? `<strong>Sprint Goal:</strong> ${sprint.goal}` : 'This sprint iteration has ended or been marked completed.'}</p>
        <p style="font-size: 12px; color: #64748b;">Iteration Window: ${startStr} → ${endStr}</p>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-val" style="color: #10b981;">${completedTasks}/${totalTasks}</div>
            <div class="stat-lbl">Tasks Done</div>
          </div>
          <div class="stat-box">
            <div class="stat-val" style="color: #818cf8;">${completionPct}%</div>
            <div class="stat-lbl">Completion Rate</div>
          </div>
          <div class="stat-box">
            <div class="stat-val" style="color: #f59e0b;">${inProgressTasks}</div>
            <div class="stat-lbl">Carried / Active</div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${reportsUrl}" class="btn" target="_blank">View Sprint Report</a>
          <a href="${boardUrl}" class="btn" style="background: rgba(255,255,255,0.08);" target="_blank">Open Kanban Board</a>
        </div>

        <div class="footer">
          Sent via SprintSync & Brevo Transactional Mail. Review completed tasks and plan your next sprint iteration.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: recipients, subject, html });
}

/**
 * 4. Sprint / Workspace Notification Email (Manual or Status Notification)
 */
async function sendSprintNotificationEmail(recipients, sprint, title, message, senderName = 'Workspace Admin') {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const boardUrl = `${clientUrl}/board`;

  const subject = `📢 ${title} — ${sprint ? sprint.name : 'SprintSync Update'}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e17; color: #f1f5f9; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #161824; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #6366f1; margin-bottom: 20px; display: inline-block; }
        h1 { font-size: 20px; color: #ffffff; margin-bottom: 12px; }
        p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 12px 0; }
        .msg-box { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px; padding: 18px; margin: 18px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; margin: 16px 0; font-size: 14px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">⚡ SprintSync</div>
        <h1>${title}</h1>
        <p><strong>From:</strong> ${senderName}${sprint ? ` · <strong>Sprint:</strong> ${sprint.name}` : ''}</p>
        <div class="msg-box">
          <p style="margin: 0; color: #f8fafc;">${message}</p>
        </div>
        <div style="text-align: center;">
          <a href="${boardUrl}" class="btn" target="_blank">Open Sprint Board</a>
        </div>
        <div class="footer">
          SprintSync Real-time Team Notifications.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: recipients, subject, html });
}

module.exports = {
  sendMail,
  sendEmployeeInviteEmail,
  sendTaskAssignmentEmail,
  sendSprintEndedEmail,
  sendSprintNotificationEmail,
  getDevEmailOutbox: () => devEmailOutbox,
  getEmailProviderInfo,
};
