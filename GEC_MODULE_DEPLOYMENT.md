# GEC Module - Deployment Guide

## 🎯 Module Overview

The GEC (Gestion Électronique du Courrier) module is now fully functional and ready for deployment. This module provides:

- **Email Management**: Send, track, and manage correspondence
- **Template System**: Configurable email templates with variables
- **Automated Relances**: SLA monitoring and automatic follow-ups
- **Outlook Integration**: Microsoft 365 email integration
- **AI Insights**: Pattern recognition for recurring issues
- **Real-time Analytics**: Comprehensive reporting and dashboards

## 📋 Prerequisites

### Backend Requirements
- Node.js 18+ 
- PostgreSQL database
- SMTP server access (configured for smtp.gnet.tn)
- AI microservice running on port 8002

### Frontend Requirements
- React 18+
- Material-UI components
- TypeScript support

## 🔧 Configuration

### 1. Environment Variables (.env)

```env
# Email Configuration for GEC Module
SMTP_HOST=smtp.gnet.tn
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@arstunisia.com
SMTP_PASS=NR*ars2025**##
SMTP_FROM="ARS Tunisia <noreply@arstunisia.com>"

# Microsoft 365 Integration
MS_CLIENT_ID=your-client-id
MS_CLIENT_SECRET=your-client-secret
MS_TENANT_ID=your-tenant-id
MS_REDIRECT_URI=http://localhost:3000/auth/outlook/callback

# AI Microservice
AI_MICROSERVICE_URL=http://localhost:8002
AI_MICROSERVICE_ENABLED=true
```

### 2. Database Schema

The following models are required in your Prisma schema:

```prisma
model Courrier {
  id           String         @id @default(uuid())
  subject      String
  body         String
  type         CourrierType
  templateUsed String
  status       CourrierStatus
  sentAt       DateTime?
  responseAt   DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  bordereauId  String?
  uploadedById String
  bordereau    Bordereau?     @relation("BordereauCourriers", fields: [bordereauId], references: [id])
  uploader     User           @relation("UserCourriers", fields: [uploadedById], references: [id])
}

model Template {
  id        String   @id @default(uuid())
  name      String
  subject   String
  body      String
  variables String[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum CourrierType {
  REGLEMENT
  RELANCE
  RECLAMATION
  AUTRE
}

enum CourrierStatus {
  DRAFT
  SENT
  FAILED
  PENDING_RESPONSE
  RESPONDED
}
```

## 🚀 Deployment Steps

### 1. Backend Deployment

```bash
# Install dependencies
cd server
npm install

# Run database migrations
npx prisma migrate deploy

# Build the application
npm run build

# Start the server
npm run start:prod
```

### 2. Frontend Deployment

```bash
# Install dependencies
cd frontend
npm install

# Build the application
npm run build

# Serve the built files
npm run start
```

### 3. AI Microservice

```bash
# Start AI microservice
cd ai-microservice
pip install -r requirements.txt
python ai_microservice.py
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
node test-gec-module.js
```

This will test:
- ✅ Template Management
- ✅ Courrier Creation & Sending
- ✅ Email Integration
- ✅ Analytics & Reporting
- ✅ SLA Monitoring
- ✅ Automatic Relances
- ✅ AI Integration
- ✅ Search Functionality

## 📊 Features Overview

### 1. Dashboard
- Real-time statistics
- Volume trends
- SLA compliance monitoring
- Urgent items alerts

### 2. Correspondence Management
- Create and send emails
- Template-based composition
- Automatic archiving in GED
- Status tracking

### 3. Inbox/Outbox
- Incoming correspondence management
- Sent items tracking
- Response management
- Priority handling

### 4. Relance System
- Automatic SLA monitoring
- Scheduled relance sending
- Escalation workflows
- Manual relance creation

### 5. Outlook Integration
- Microsoft 365 connectivity
- Email synchronization
- Calendar integration
- Contact management

### 6. AI Insights
- Pattern recognition
- Recurring issue detection
- Automated recommendations
- Predictive analytics

### 7. Template Management
- Dynamic template creation
- Variable substitution
- Version control
- Preview functionality

## 🔐 Security Features

- Role-based access control
- Email encryption (SSL/TLS)
- Audit logging
- Secure authentication

## 📈 Performance Optimizations

- Cron-based automation
- Efficient database queries
- Email queue management
- Real-time notifications

## 🛠️ Maintenance

### Daily Tasks
- Monitor SLA breaches
- Review relance effectiveness
- Check email delivery status

### Weekly Tasks
- Analyze AI insights
- Update templates as needed
- Review escalation patterns

### Monthly Tasks
- Performance analytics review
- Template optimization
- System health check

## 🆘 Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP configuration
   - Verify credentials
   - Test network connectivity

2. **AI Insights Not Loading**
   - Ensure AI microservice is running
   - Check API connectivity
   - Verify data availability

3. **SLA Alerts Not Working**
   - Check cron job configuration
   - Verify database connections
   - Review notification settings

### Support Contacts
- Technical Support: support@arstunisia.com
- System Administrator: admin@arstunisia.com

## 📝 API Endpoints

### Courriers
- `POST /courriers` - Create courrier
- `GET /courriers/search` - Search courriers
- `POST /courriers/:id/send` - Send courrier
- `GET /courriers/analytics` - Get analytics
- `GET /courriers/sla-breaches` - Get SLA breaches

### Templates
- `GET /courriers/templates` - List templates
- `POST /courriers/templates` - Create template
- `PUT /courriers/templates/:id` - Update template
- `DELETE /courriers/templates/:id` - Delete template

### Relances
- `POST /courriers/trigger-relances` - Trigger automatic relances
- `POST /courriers/bordereau/:id/relance` - Create manual relance

### AI
- `GET /courriers/ai-insights` - Get AI pattern analysis

## 🎉 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SMTP server tested
- [ ] AI microservice running
- [ ] Frontend built and deployed
- [ ] Backend services started
- [ ] Test suite passed
- [ ] User access configured
- [ ] Monitoring enabled
- [ ] Documentation updated

## 📞 Post-Deployment

After successful deployment:

1. Train users on new features
2. Monitor system performance
3. Collect user feedback
4. Plan future enhancements
5. Schedule regular maintenance

---

**Status**: ✅ Ready for Production Deployment
**Version**: 1.0.0
**Last Updated**: January 2025