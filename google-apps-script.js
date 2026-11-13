/**
 * ============================================================================
 * SprintSync Transactional Email Relay (Google Apps Script)
 * Version: 2.1.0
 * Architecture: HTTPS POST Bridge (Port 443) -> Gmail MailApp
 * ============================================================================
 * 
 * Features:
 * - Enterprise-grade HTTPS relay bypassing Render free-tier SMTP blocks (ports 25/465/587)
 * - Zero domain configuration & zero phone verification required
 * - Direct inbox delivery powered by Google Mail servers
 * - Token authentication & quota guardrail monitoring
 * - Interactive visual web status dashboard for browser visits
 */

// Shared secret token (must match GOOGLE_APPS_SCRIPT_SECRET in Render Environment)
var SCRIPT_SECRET = "sprintsync_apps_script_secret_2026";

/**
 * Handle POST requests from SprintSync Backend
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = {};
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      return jsonResponse({
        success: false,
        status: "error",
        message: "Malformed JSON payload: " + parseErr.message
      }, 400);
    }

    // 1. Verify Authentication Token
    if (SCRIPT_SECRET && SCRIPT_SECRET.trim().length > 0) {
      if (!data.token || data.token !== SCRIPT_SECRET) {
        return jsonResponse({
          success: false,
          status: "error",
          message: "Unauthorized: Invalid or missing script secret token"
        }, 401);
      }
    }

    // 2. Validate Quota Availability
    var quota = MailApp.getRemainingDailyQuota();
    if (quota <= 0) {
      return jsonResponse({
        success: false,
        status: "error",
        message: "Daily Gmail sending quota exhausted (0 remaining today). Resets at midnight PT."
      }, 429);
    }

    // 3. Normalize Recipients
    var rawRecipients = data.to;
    var recipientList = [];
    if (Array.isArray(rawRecipients)) {
      recipientList = rawRecipients;
    } else if (typeof rawRecipients === 'string') {
      recipientList = rawRecipients.split(',');
    }
    recipientList = recipientList.map(function(r) { return (r || '').trim(); }).filter(Boolean);

    if (recipientList.length === 0) {
      return jsonResponse({
        success: false,
        status: "error",
        message: "Missing 'to' recipient email address"
      }, 400);
    }

    // 4. Prepare Email Content
    var subject = (data.subject || "SprintSync Notification").trim();
    var htmlBody = data.html || data.text || "";
    var textBody = data.text || (htmlBody ? htmlBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                                    .replace(/<[^>]+>/g, ' ')
                                                    .replace(/\s+/g, ' ')
                                                    .trim() : "");
    var senderName = (data.fromName || "SprintSync Team").trim();
    var toAddressString = recipientList.join(', ');

    var mailOptions = {
      to: toAddressString,
      subject: subject,
      htmlBody: htmlBody,
      body: textBody,
      name: senderName
    };

    if (data.replyTo && typeof data.replyTo === 'string' && data.replyTo.trim()) {
      mailOptions.replyTo = data.replyTo.trim();
    }

    // 5. Dispatch via Gmail Infrastructure
    MailApp.sendEmail(mailOptions);

    var messageId = "gas-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
    var remainingQuota = MailApp.getRemainingDailyQuota();

    console.log("[SprintSync Relay] Dispatched email to: " + toAddressString + " | Subject: " + subject);

    return jsonResponse({
      success: true,
      status: "success",
      message: "Email delivered successfully via Google MailApp",
      messageId: messageId,
      recipients: recipientList,
      sentAt: new Date().toISOString(),
      remainingQuota: remainingQuota
    }, 200);

  } catch (error) {
    console.error("[SprintSync Relay Error]", error);
    return jsonResponse({
      success: false,
      status: "error",
      message: error.toString()
    }, 500);
  }
}

/**
 * Handle GET requests (Interactive Browser Dashboard & Health Checks)
 */
function doGet(e) {
  var format = (e && e.parameter && e.parameter.format) || "";
  var remainingQuota = MailApp.getRemainingDailyQuota();
  var userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "Connected Gmail";

  if (format === 'json') {
    return jsonResponse({
      status: "online",
      service: "SprintSync Google Apps Script Relay",
      version: "2.1.0",
      relayEmail: userEmail,
      remainingQuota: remainingQuota,
      timestamp: new Date().toISOString()
    });
  }

  // Interactive Modern HTML Dashboard
  var html = '<!DOCTYPE html>' +
  '<html lang="en">' +
  '<head>' +
  '  <meta charset="UTF-8">' +
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  '  <title>SprintSync Email Relay</title>' +
  '  <style>' +
  '    * { box-sizing: border-box; margin: 0; padding: 0; }' +
  '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }' +
  '    .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }' +
  '    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #1f2937; }' +
  '    .logo { font-size: 20px; font-weight: 700; color: #6366f1; display: flex; align-items: center; gap: 8px; }' +
  '    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }' +
  '    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }' +
  '    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }' +
  '    .metric-box { background: #1f2937; padding: 16px; border-radius: 12px; border: 1px solid #374151; }' +
  '    .metric-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }' +
  '    .metric-val { font-size: 24px; font-weight: 700; color: #ffffff; }' +
  '    .info-list { margin-top: 20px; font-size: 13px; color: #9ca3af; line-height: 1.6; }' +
  '    .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1f2937; }' +
  '    .info-item span:last-child { color: #f3f4f6; font-weight: 500; font-family: monospace; }' +
  '    .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; }' +
  '  </style>' +
  '</head>' +
  '<body>' +
  '  <div class="card">' +
  '    <div class="header">' +
  '      <div class="logo">⚡ SprintSync Relay</div>' +
  '      <div class="badge"><div class="pulse"></div> Online</div>' +
  '    </div>' +
  '    <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">This Google Apps Script HTTPS Web App is actively listening for transactional email dispatches from your SprintSync backend on Render.</p>' +
  '    <div class="metric-grid">' +
  '      <div class="metric-box">' +
  '        <div class="metric-label">Daily Quota Left</div>' +
  '        <div class="metric-val" style="color: #10b981;">' + remainingQuota + '</div>' +
  '      </div>' +
  '      <div class="metric-box">' +
  '        <div class="metric-label">Port & Security</div>' +
  '        <div class="metric-val" style="font-size: 18px; color: #6366f1;">HTTPS : 443</div>' +
  '      </div>' +
  '    </div>' +
  '    <div class="info-list">' +
  '      <div class="info-item"><span>Sender Account</span><span>' + userEmail + '</span></div>' +
  '      <div class="info-item"><span>Engine</span><span>Google MailApp</span></div>' +
  '      <div class="info-item"><span>Render Compatibility</span><span>100% (No SMTP block)</span></div>' +
  '      <div class="info-item"><span>Token Auth</span><span>Enabled</span></div>' +
  '    </div>' +
  '    <div class="footer">SprintSync Platform &bull; Production Ready</div>' +
  '  </div>' +
  '</body>' +
  '</html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("SprintSync Email Relay")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Utility helper to build formatted JSON responses
 */
function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
