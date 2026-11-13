/**
 * SprintSync Google Apps Script Email Relay
 * -----------------------------------------
 * This script runs inside your personal Google Account (script.google.com).
 * It receives HTTPS POST requests from your SprintSync backend on Render and sends
 * emails directly using your Gmail quota (up to 100 emails/day free on standard Gmail, 1,500/day on Google Workspace).
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open https://script.google.com/ in your browser (logged into your Gmail).
 * 2. Click "+ New project".
 * 3. Delete any default code in Code.gs, paste this entire file into it, and press Ctrl+S (Save).
 * 4. Click the blue "Deploy" button at top-right -> Select "New deployment".
 * 5. Click the gear icon (Select type) next to "Select type" -> choose "Web app".
 * 6. Set the fields:
 *    - Description: "SprintSync Email Relay"
 *    - Execute as: "Me (<your-email>@gmail.com)"
 *    - Who has access: "Anyone"  <-- CRITICAL: Choose "Anyone" so Render can call it!
 * 7. Click "Deploy".
 * 8. Click "Authorize access", choose your Google account. If Google displays "Google hasn't verified this app",
 *    click "Advanced" (at the bottom) -> "Go to Untitled project (unsafe)" -> click "Allow".
 * 9. Copy the "Web app URL" (looks like https://script.google.com/macros/s/AKfycbx.../exec).
 * 10. Add this URL to Render Dashboard -> sprintsync-api -> Environment:
 *     GOOGLE_APPS_SCRIPT_URL = <your-web-app-url>
 *     GOOGLE_APPS_SCRIPT_SECRET = sprintsync_apps_script_secret_2026
 */

var SCRIPT_SECRET = "sprintsync_apps_script_secret_2026"; // Matches GOOGLE_APPS_SCRIPT_SECRET in backend

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(raw);

    // Verify secret token
    if (SCRIPT_SECRET && data.token && data.token !== SCRIPT_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Unauthorized: Invalid script secret token"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var recipients = data.to;
    if (Array.isArray(recipients)) {
      recipients = recipients.join(',');
    }

    if (!recipients || !recipients.trim()) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing 'to' recipient email address"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var subject = data.subject || "SprintSync Notification";
    var htmlBody = data.html || data.text || "";
    var textBody = data.text || (htmlBody ? htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : "");
    var senderName = data.fromName || "SprintSync Team";

    // Send email using Gmail's MailApp
    MailApp.sendEmail({
      to: recipients.trim(),
      subject: subject,
      htmlBody: htmlBody,
      body: textBody,
      name: senderName
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Email sent successfully",
      messageId: "gas-" + new Date().getTime(),
      remainingQuota: MailApp.getRemainingDailyQuota()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "SprintSync Google Apps Script Relay",
    remainingQuota: MailApp.getRemainingDailyQuota()
  })).setMimeType(ContentService.MimeType.JSON);
}
