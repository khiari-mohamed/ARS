# GEC MODULE - TAB DATA REQUIREMENTS

## 📊 1. DASHBOARD TAB
**Purpose**: Overview of GEC system performance and correspondence analytics

### Data to Display:
- **KPI Cards**:
  - Total Courriers count (this month)
  - Pending Replies count
  - SLA Compliance percentage
  - Urgent/Overdue items count

- **Charts**:
  - Volume Trend (Line chart: Last 7 days sent vs received)
  - Type Distribution (Pie chart: REGLEMENT, RECLAMATION, RELANCE, AUTRE)
  - SLA Status Distribution

- **Urgent Items Table**:
  - Subject, Type, Days Overdue, Priority
  - Color-coded priority chips (🟢🟠🔴)

- **Real-time Metrics**:
  - Success rate calculation
  - Response time averages
  - Escalation alerts

---

## 📝 2. CREATE CORRESPONDENCE TAB
**Purpose**: Create and send correspondence using templates

### Data to Display:
- **Template Selector**:
  - Available templates from database
  - Template preview and variables
  - AI-powered auto-fill suggestions

- **Form Fields**:
  - Client dropdown (from clients table)
  - Priority selector (NORMAL, URGENT, CRITIQUE)
  - Subject and body text areas
  - Recipient email field
  - SLA deadline picker

- **Dynamic Features**:
  - Template variable replacement
  - Client email auto-population
  - Real-time preview generation
  - Attachment support

- **Action Buttons**:
  - Save as Draft
  - Send Immediately
  - Schedule Send
  - Preview Message

---

## 📥 3. INBOX TAB
**Purpose**: Manage incoming correspondence and responses

### Data to Display:
- **Filters**:
  - Status filter (PENDING_RESPONSE, RESPONDED, CLOSED)
  - Priority filter
  - Date range filters
  - Type filters

- **Correspondence Table**:
  - Reference number
  - From (sender)
  - Date received
  - Type and status chips
  - SLA status indicators
  - Action buttons (View, Reply, Forward, Link)

- **Action Dialogs**:
  - View: Full correspondence details
  - Reply: Response composition
  - Forward: Transfer to another recipient
  - Link: Associate with bordereau/contract

### Data Sources:
- Courriers with status: SENT, PENDING_RESPONSE, RESPONDED
- User information for senders
- SLA calculations based on timestamps

---

## 📤 4. OUTBOX TAB
**Purpose**: Track outgoing correspondence and delivery status

### Data to Display:
- **Status Overview**:
  - Draft count
  - Sent count
  - Failed count
  - Delivery rates

- **Outgoing Items Table**:
  - Subject and recipient
  - Send date/time
  - Delivery status
  - Read receipts
  - Action buttons (Resend, Edit, Delete)

- **Delivery Tracking**:
  - Email delivery confirmations
  - Read receipt indicators
  - Bounce notifications
  - Retry attempts

### Data Sources:
- Courriers with status: DRAFT, SENT, FAILED
- Mail tracking events from audit logs
- SMTP delivery confirmations

---

## 🔄 5. RELANCE MANAGER TAB
**Purpose**: Automated follow-up and reminder management

### Data to Display:
- **Relance Statistics**:
  - Total relances sent
  - Items requiring relance
  - Success rates
  - Overdue items count

- **Overdue Items Table**:
  - Subject and client
  - Days overdue
  - Last contact date
  - Priority level
  - Action buttons (Send Relance, Escalate)

- **Automated Rules**:
  - SLA thresholds configuration
  - Escalation workflows
  - Template assignments
  - Scheduling options

- **Recent Relances**:
  - Recently sent follow-ups
  - Response tracking
  - Effectiveness metrics

### Data Sources:
- Courriers with type: RELANCE
- SLA breach calculations
- Automated cron job results

---

## 🔗 6. OUTLOOK INTEGRATION TAB
**Purpose**: Microsoft Outlook/365 integration management

### Data to Display:
- **Connection Status**:
  - Authentication status
  - Last sync timestamp
  - Feature availability (Email, Calendar, Contacts)
  - Error messages

- **Integration Statistics**:
  - Emails sent via Outlook
  - Contacts synced
  - Calendar events created
  - Sync success rates

- **Configuration Panel**:
  - OAuth authentication
  - Sync settings
  - Feature toggles
  - Test connection button

- **Activity Log**:
  - Recent integration activities
  - Sync history
  - Error logs

### Data Sources:
- Audit logs with Outlook-related actions
- Integration status from service
- OAuth token information

---

## 📈 7. MAIL TRACKING TAB
**Purpose**: Email engagement and delivery analytics

### Data to Display:
- **Summary Metrics**:
  - Total messages sent
  - Delivery rate percentage
  - Open rate percentage
  - Response rate percentage

- **Engagement Timeline**:
  - Daily sent/delivered/opened/replied metrics
  - Interactive charts
  - Trend analysis

- **Delivery Status**:
  - Message delivery confirmations
  - Bounce notifications
  - Read receipts
  - Click tracking

- **Response Analytics**:
  - Response times
  - Sentiment analysis
  - Auto-reply detection
  - Top recipients

### Data Sources:
- Mail tracking events from audit logs
- Delivery confirmations
- Read receipt data
- Response tracking information

---

## 📄 8. TEMPLATE MANAGER TAB
**Purpose**: Advanced template creation and management

### Data to Display:
- **Template Library**:
  - Available templates list
  - Template categories
  - Usage statistics
  - Creation dates

- **Template Editor**:
  - Rich text editor
  - Variable insertion
  - Preview functionality
  - Version control

- **Template Analytics**:
  - Usage frequency
  - Success rates
  - A/B test results
  - Performance metrics

- **Management Actions**:
  - Create/Edit/Delete templates
  - Duplicate templates
  - Import/Export functionality
  - Template validation

### Data Sources:
- Template and GecTemplate tables
- Template usage statistics
- A/B testing results

---

## 🤖 9. AI INSIGHTS TAB
**Purpose**: AI-powered correspondence analytics and insights

### Data to Display:
- **Pattern Recognition**:
  - Recurring issues identification
  - Client complaint patterns
  - Response effectiveness
  - Trend analysis

- **Sentiment Analysis**:
  - Response sentiment distribution
  - Client satisfaction metrics
  - Escalation predictions
  - Mood trends

- **AI Recommendations**:
  - Template optimization suggestions
  - Response time improvements
  - Workflow enhancements
  - Automation opportunities

- **Analysis Results**:
  - Confidence scores
  - Pattern strength indicators
  - Actionable insights
  - Performance predictions

### Data Sources:
- Courrier content analysis
- AI microservice results
- Response sentiment data
- Pattern recognition algorithms

---

## 🔍 10. SEARCH & ARCHIVE TAB
**Purpose**: Advanced search and correspondence archiving

### Data to Display:
- **Search Interface**:
  - Advanced search filters
  - Full-text search capability
  - Date range selectors
  - Status and type filters

- **Search Results**:
  - Correspondence list with highlights
  - Relevance scoring
  - Quick preview
  - Export options

- **Archive Statistics**:
  - Total archived items
  - Storage usage
  - Retention policies
  - Cleanup schedules

- **Archive Management**:
  - Bulk operations
  - Export functionality
  - Retention settings
  - Compliance reporting

### Data Sources:
- All courrier records
- Search indexing data
- Archive metadata
- Compliance tracking

---

## 📈 11. REPORTS TAB
**Purpose**: Comprehensive reporting and business intelligence

### Data to Display:
- **Performance Reports**:
  - SLA compliance by client
  - Response time analytics
  - Volume trends
  - Success rate metrics

- **Client Analytics**:
  - Communication frequency
  - Response patterns
  - Satisfaction scores
  - Issue resolution times

- **Operational Reports**:
  - Team performance
  - Template effectiveness
  - System utilization
  - Cost analysis

- **Export Options**:
  - PDF report generation
  - Excel data export
  - Scheduled reports
  - Custom report builder

### Data Sources:
- Comprehensive courrier analytics
- Client interaction data
- Performance metrics
- Historical trend data

---

## 🎯 DATA SOURCES SUMMARY

### Primary Tables:
- `courrier` - Core correspondence records
- `template` - Standard templates
- `gecTemplate` - Enhanced GEC templates
- `client` - Client information
- `user` - User data and assignments
- `auditLog` - Activity tracking and mail events
- `bordereau` - Linked business documents

### Key Relationships:
- Courrier → Client (correspondence recipients)
- Courrier → User (creators and handlers)
- Courrier → Template (template usage)
- Courrier → Bordereau (business context)
- AuditLog → Mail tracking events

### Calculated Fields:
- SLA compliance (based on timestamps vs thresholds)
- Response times (creation to resolution)
- Delivery rates (sent vs delivered)
- Engagement metrics (opens, clicks, responses)

### Real-time Features:
- Live SLA monitoring
- Delivery status updates
- Response notifications
- Escalation alerts
- Performance dashboards