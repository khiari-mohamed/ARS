# 📧 Email & Notification Testing Guide

## Prerequisites

1. **Server must be running**
2. **SMTP credentials configured in `.env`**
3. **Database seeded with test data**

## Current SMTP Configuration

```
SMTP_HOST=smtp.gnet.tn
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@arstunisia.com
SMTP_PASS=NR*ars2025**##
```

## Step-by-Step Testing

### 1. Start the Server

Open **Terminal 1**:
```bash
cd D:\ARS\server
npm run start:dev
```

Wait until you see:
```
🚀 Server (with socket.io) running on port 5000
```

### 2. Run the Test Script

Open **Terminal 2**:
```bash
cd D:\ARS\server
node test-email-notifications.js
```

## What the Test Script Does

1. ✅ **Authentication** - Logs in as admin
2. ✅ **SMTP Connection** - Tests connection to smtp.gnet.tn
3. ✅ **Create Bordereau** - Creates test bordereau
4. ✅ **Create Courrier** - Creates draft email
5. ✅ **Send Email** - Sends actual email via SMTP
6. ✅ **Notification Preferences** - Tests user preferences
7. ✅ **Reassignment Notification** - Tests reassignment emails
8. ✅ **In-App Notifications** - Tests notification system
9. ✅ **Automatic Relance** - Tests automatic reminders
10. ✅ **SMTP Statistics** - Checks email stats
11. ✅ **Email Tracking** - Tests tracking features

## Manual Testing via API

### Test 1: SMTP Connection Test
```bash
curl -X POST http://localhost:5000/api/gec/test-smtp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "host": "smtp.gnet.tn",
    "port": 465,
    "secure": true,
    "user": "noreply@arstunisia.com",
    "password": "NR*ars2025**##"
  }'
```

### Test 2: Send Test Email
```bash
# 1. Create courrier
curl -X POST http://localhost:5000/api/gec/courriers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "Test Email",
    "body": "<h1>Test</h1><p>This is a test email</p>",
    "type": "NOTIFICATION"
  }'

# 2. Send courrier (use ID from step 1)
curl -X POST http://localhost:5000/api/gec/courriers/COURRIER_ID/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipientEmail": "your-email@example.com"
  }'
```

### Test 3: Check SMTP Stats
```bash
curl http://localhost:5000/api/gec/smtp-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: Get Notifications
```bash
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Results

### ✅ Success Indicators
- SMTP connection test returns `success: true`
- Emails appear in recipient inbox
- Notifications created in database
- SMTP stats show sent count increasing

### ⚠️ Common Issues

**Issue**: "SMTP connection failed"
- **Solution**: Check SMTP credentials in `.env`
- **Solution**: Verify network access to smtp.gnet.tn:465

**Issue**: "Email sent but not received"
- **Solution**: Check spam folder
- **Solution**: Verify recipient email is valid
- **Solution**: Check SMTP server logs

**Issue**: "Cannot POST /gec/test-smtp"
- **Solution**: Server not running - start with `npm run start:dev`
- **Solution**: Wrong API URL - use `/api` prefix

## Monitoring Email Delivery

### Check Server Logs
Look for these messages:
```
✅ SMTP connection verified successfully
📧 Email sent successfully to user@example.com
```

### Check Database
```sql
-- Check sent courriers
SELECT id, subject, status, "sentAt" 
FROM "Courrier" 
WHERE status = 'SENT' 
ORDER BY "sentAt" DESC;

-- Check notifications
SELECT id, type, title, message, read, "createdAt"
FROM "Notification"
ORDER BY "createdAt" DESC;
```

## Testing Specific Features

### Test Automatic Relances
```bash
# Trigger manual relance check
curl -X POST http://localhost:5000/api/gec/trigger-relances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Email Tracking
```bash
curl http://localhost:5000/api/gec/email-tracking?period=7d \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Reassignment Notification
```bash
curl -X POST http://localhost:5000/api/notifications/reassignment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "bordereauId": "BORDEREAU_ID",
    "fromUserId": "USER_ID_1",
    "toUserId": "USER_ID_2",
    "comment": "Test reassignment",
    "timestamp": "2024-01-01T00:00:00Z"
  }'
```

## Troubleshooting

### Enable Debug Logging
Add to `.env`:
```
LOG_LEVEL=debug
```

### Test SMTP Manually (Node.js)
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gnet.tn',
  port: 465,
  secure: true,
  auth: {
    user: 'noreply@arstunisia.com',
    pass: 'NR*ars2025**##'
  }
});

transporter.verify()
  .then(() => console.log('✅ SMTP OK'))
  .catch(err => console.error('❌ SMTP Error:', err));
```

## Success Criteria

- [ ] SMTP connection test passes
- [ ] Test email received in inbox
- [ ] Notifications appear in database
- [ ] Reassignment emails sent successfully
- [ ] SMTP stats show correct counts
- [ ] Email tracking data populated
- [ ] No errors in server logs

## Next Steps

After successful testing:
1. Configure production SMTP credentials
2. Set up email templates
3. Configure notification preferences per user
4. Enable automatic relances (cron job)
5. Monitor email delivery rates
