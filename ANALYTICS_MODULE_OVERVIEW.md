# 📊 ARS Analytics Module - Complete Overview

## 🎯 Module Purpose
The Analytics module provides comprehensive real-time monitoring, AI-powered insights, predictive analytics, and performance tracking for the entire ARS application.

---

## 🏗️ Backend Architecture

### Core Files Structure
```
server/src/analytics/
├── analytics.module.ts          # Main module configuration
├── analytics.controller.ts      # REST API endpoints
├── analytics.service.ts         # Core analytics logic
├── advanced-filtering.controller.ts
├── advanced-filtering.service.ts
├── real-time-analytics.service.ts
├── sla-analytics.service.ts
├── ov-analytics.service.ts
├── predictive-analytics.service.ts
├── reports.service.ts
├── scheduled-reports.service.ts
├── document-types.service.ts
└── dto/
    ├── analytics-kpi.dto.ts
    ├── analytics-performance.dto.ts
    └── analytics-export.dto.ts
```

---

## 📡 Backend API Endpoints

### 1. **KPI & Performance Endpoints**
```typescript
GET /analytics/kpis/daily
  - Query: fromDate, toDate, teamId, userId
  - Returns: Daily KPIs (bordereaux count, avg delay, SLA compliance)

GET /analytics/performance/by-user
  - Query: teamId, userId, role, fromDate, toDate
  - Returns: User performance metrics

GET /analytics/performance/by-department
  - Query: fromDate, toDate
  - Returns: Department-level performance breakdown
```

### 2. **SLA Analytics Endpoints**
```typescript
GET /analytics/sla/dashboard
  - Returns: SLA compliance overview, by client, by user, trends

GET /analytics/sla/predictions
  - Returns: AI-powered SLA breach predictions

GET /analytics/sla/capacity
  - Returns: Capacity analysis for all users

GET /analytics/sla-compliance-by-user
  - Returns: Detailed SLA compliance per user

GET /analytics/sla-trend
  - Returns: Historical SLA trend data
```

### 3. **OV (Ordre de Virement) Analytics**
```typescript
GET /analytics/ov/dashboard
  - Query: fromDate, toDate, company, status, sortBy, sortOrder
  - Returns: OV overview, list, status breakdown, trends, alerts

GET /analytics/ov/export
  - Returns: Excel export of OV data

GET /analytics/ov/statistics
  - Returns: OV statistics (counts, rates, amounts)
```

### 4. **AI-Powered Analytics Endpoints**
```typescript
POST /analytics/ai/priorities
  - Body: items[]
  - Returns: AI-prioritized task list

POST /analytics/ai/reassignment
  - Body: workload data
  - Returns: AI reassignment recommendations

POST /analytics/ai/performance
  - Body: users[], analysis_type
  - Returns: AI performance analysis

POST /analytics/ai/compare-performance
  - Body: planned[], actual[]
  - Returns: Performance comparison with AI insights

POST /analytics/ai/forecast-trends
  - Body: historicalData[]
  - Returns: AI trend forecasting

POST /analytics/ai/root-cause-analysis
  - Returns: Root cause analysis of performance issues

POST /analytics/ai/optimization-recommendations
  - Returns: AI optimization suggestions

POST /analytics/ai/bottleneck-detection
  - Returns: Process bottleneck identification

POST /analytics/ai/training-needs
  - Returns: Training needs identification

POST /analytics/ai/advanced-clustering
  - Returns: Advanced process clustering analysis

POST /analytics/ai/sophisticated-anomaly-detection
  - Returns: Sophisticated anomaly detection

POST /analytics/ai/executive-report
  - Body: report_type, time_period, include_forecasts
  - Returns: Comprehensive executive report
```

### 5. **Alerts & Recommendations**
```typescript
GET /analytics/alerts
  - Returns: Critical, warning, and OK alerts

GET /analytics/recommendations
  - Returns: System recommendations (staffing, etc.)

GET /analytics/recommendations/enhanced
  - Returns: AI-enhanced recommendations

GET /analytics/alert-escalation-flag
  - Returns: Whether alerts need escalation
```

### 6. **Forecasting & Trends**
```typescript
GET /analytics/forecast
  - Returns: AI-powered workload forecast (weekly, monthly)

GET /analytics/trends
  - Query: period (day/week/month)
  - Returns: Historical trends

GET /analytics/throughput-gap
  - Returns: Gap between capacity and workload
```

### 7. **Workforce & Resource Planning**
```typescript
GET /analytics/current-staff
  - Returns: Current staff count

GET /analytics/planned-vs-actual
  - Query: fromDate, toDate
  - Returns: Planned vs actual performance comparison

GET /analytics/ai-recommendations
  - Returns: AI workforce recommendations

GET /analytics/resource-planning
  - Returns: Resource planning breakdown

GET /analytics/workforce-estimator
  - Query: period
  - Returns: Workforce estimation with department analysis
```

### 8. **Document Analytics**
```typescript
GET /analytics/documents/comprehensive-stats
  - Query: documentType, fromDate, toDate
  - Returns: Comprehensive document statistics by type

GET /analytics/documents/types-breakdown
  - Returns: Document types breakdown with status counts

GET /analytics/documents/status-by-type
  - Returns: Status distribution per document type

GET /analytics/documents/sla-compliance-by-type
  - Returns: SLA compliance per document type
```

### 9. **Gestionnaire Performance**
```typescript
GET /analytics/gestionnaires/daily-performance
  - Query: fromDate, toDate
  - Returns: Daily performance metrics per gestionnaire
```

### 10. **Advanced Filtering**
```typescript
GET /analytics/bordereaux/filtered
  - Query: fromDate, toDate, filters (JSON), drillDown (JSON)
  - Returns: Filtered bordereau data

GET /analytics/reclamations/filtered
  - Query: fromDate, toDate, filters (JSON), drillDown (JSON)
  - Returns: Filtered reclamation data

GET /analytics/virements/filtered
  - Query: fromDate, toDate, filters (JSON), drillDown (JSON)
  - Returns: Filtered virement data

GET /analytics/drill-down
  - Query: dataSource, filters, drillDownLevel, parentDimension, parentValue
  - Returns: Drill-down options for hierarchical analysis
```

### 11. **Reclamation & Courrier Analytics**
```typescript
GET /analytics/reclamation-performance
  - Returns: Reclamation performance metrics

GET /analytics/courriers/volume
  - Returns: Courrier volume by type

GET /analytics/courriers/sla-breaches
  - Returns: Courrier SLA breaches

GET /analytics/courriers/recurrence
  - Returns: Recurring courrier patterns

GET /analytics/courriers/escalations
  - Returns: Courrier escalations
```

### 12. **Export & Traceability**
```typescript
GET /analytics/export
  - Query: format (csv/excel/pdf), fromDate, toDate
  - Returns: Exported analytics data

GET /analytics/traceability/:bordereauId
  - Returns: Complete traceability for a bordereau
```

### 13. **Filter Options**
```typescript
GET /analytics/filter-options/departments
  - Returns: List of departments

GET /analytics/filter-options/teams
  - Returns: List of teams
```

---

## 🎨 Frontend Architecture

### Core Files Structure
```
frontend/src/
├── api/
│   └── analyticsApi.ts          # API client functions
├── services/
│   ├── analyticsService.ts      # AI analytics service
│   └── aiAnalyticsService.ts    # Advanced AI service
├── hooks/
│   ├── useAnalytics.ts          # Main analytics hook
│   └── useAnalytics.mock.ts     # Mock data for testing
├── types/
│   ├── analytics.d.ts           # Type definitions
│   └── analytics-extended.d.ts  # Extended types
└── components/analytics/
    ├── AnalyticsDashboard.tsx
    ├── PerformanceDashboard.tsx
    ├── SLAStatusPanel.tsx
    ├── OVAnalyticsDashboard.tsx
    ├── PredictiveAnalyticsDashboard.tsx
    ├── ExecutiveDashboard.tsx
    ├── RealTimeDashboard.tsx
    ├── DocumentAnalyticsDashboard.tsx
    ├── TeamPerformanceDashboard.tsx
    ├── WorkforceEstimator.tsx
    ├── AdvancedFilteringDashboard.tsx
    └── [70+ more components]
```

---

## 🔧 Key Backend Services

### 1. **AnalyticsService** (analytics.service.ts)
Main service handling all analytics operations:
- Daily KPIs calculation
- Performance metrics by user/department
- SLA compliance tracking
- Alert generation
- AI integration for predictions
- Workforce estimation
- Document analytics
- Export functionality

**Key Methods:**
```typescript
getDailyKpis(query, user)
getPerformance(query, user)
getPerformanceByDepartment(user, query)
getSlaComplianceByUser(user, filters)
getAlerts(user)
getRecommendations(user)
getForecast(user)
getThroughputGap(user)
getWorkforceEstimator(query, user)
getDocumentTypesBreakdown(user, query)
getGestionnairesDailyPerformance(user, query)
```

### 2. **SLAAnalyticsService** (sla-analytics.service.ts)
Specialized SLA tracking and prediction:
- SLA dashboard with compliance rates
- SLA by client/user/day
- At-risk and breached bordereaux detection
- AI-powered SLA breach prediction
- Capacity analysis

**Key Methods:**
```typescript
getSLADashboard(user, filters)
predictSLABreaches(user)
getCapacityAnalysis(user)
```

### 3. **OVAnalyticsService** (ov-analytics.service.ts)
Ordre de Virement analytics:
- OV dashboard with execution tracking
- OV list with filtering and sorting
- Alert generation for pending OV
- Excel export
- Statistics (counts, rates, amounts)

**Key Methods:**
```typescript
getOVDashboard(user, filters)
exportOVToExcel(filters, user)
getOVStatistics(filters)
```

### 4. **RealTimeAnalyticsService** (real-time-analytics.service.ts)
Real-time event processing:
- Event-driven analytics updates
- Real-time KPI calculation
- SLA risk monitoring
- Performance metrics updates
- AI anomaly detection integration

**Key Methods:**
```typescript
processRealTimeEvent(eventType, data)
```

### 5. **PredictiveAnalyticsService** (predictive-analytics.service.ts)
Advanced predictive analytics:
- Trend forecasting with seasonality detection
- Capacity planning with projections
- Risk factor identification
- Optimization opportunities
- Model accuracy tracking

**Key Methods:**
```typescript
generateTrendForecast(metric, period, forecastDays)
generateCapacityPlan(resource, planningHorizon)
getPredictiveModels()
retrainModel(modelId)
```

### 6. **AdvancedFilteringService** (advanced-filtering.service.ts)
Advanced filtering and drill-down:
- Multi-criteria filtering
- Hierarchical drill-down
- Dynamic dimension exploration

**Key Methods:**
```typescript
getFilteredData(dataSource, filters, dateRange, drillDown)
getDrillDownOptions(dataSource, filters, level, parentDimension, parentValue)
```

---

## 🎣 Frontend Hooks

### Main Hook: `useAnalytics`
Comprehensive analytics hook with all features:
```typescript
const {
  kpis,
  slaData,
  ovData,
  performance,
  alerts,
  recommendations,
  forecast,
  loading,
  error,
  filters,
  updateFilters,
  resetFilters,
  loadAnalyticsData,
  loadSection,
  exportData,
  aiAnalytics,
  computedMetrics
} = useAnalytics(initialFilters);
```

### Specialized Hooks:
```typescript
useSLAAnalytics(filters)      // SLA-specific analytics
useOVAnalytics(filters)        // OV-specific analytics
useRealTimeAnalytics()         // Real-time updates
useDailyKpis(params)           // Daily KPIs only
useAlerts()                    // Alerts only
useRecommendations()           // Recommendations only
```

---

## 🤖 AI Integration

### AI Microservice URL
```typescript
const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8002'
```

### AI Endpoints Used:
1. `/token` - Authentication
2. `/sla_prediction` - SLA breach prediction
3. `/priorities` - Task prioritization
4. `/reassignment` - Workload reassignment
5. `/performance` - Performance analysis
6. `/compare_performance` - Performance comparison
7. `/diagnostic_optimisation` - Optimization recommendations
8. `/predict_resources` - Resource prediction
9. `/forecast_trends` - Trend forecasting
10. `/recommendations` - AI recommendations
11. `/advanced_clustering` - Process clustering
12. `/anomaly_detection` - Anomaly detection
13. `/generate_executive_report` - Executive reporting
14. `/pattern_recognition/process_anomalies` - Pattern recognition

---

## 📊 Key Features

### 1. **Real-Time Monitoring**
- Live KPI updates
- Real-time alert generation
- Event-driven analytics
- WebSocket support for live data

### 2. **AI-Powered Insights**
- SLA breach prediction
- Workload optimization
- Resource planning
- Anomaly detection
- Root cause analysis
- Training needs identification

### 3. **Comprehensive Dashboards**
- Executive dashboard
- Performance dashboard
- SLA dashboard
- OV dashboard
- Document analytics dashboard
- Team performance dashboard
- Predictive analytics dashboard

### 4. **Advanced Filtering**
- Multi-criteria filtering
- Hierarchical drill-down
- Dynamic dimension exploration
- Date range filtering
- Status filtering

### 5. **Export Capabilities**
- Excel export
- PDF export
- CSV export
- Scheduled reports

### 6. **Workforce Management**
- Current staff tracking
- Workforce estimation
- Capacity analysis
- Resource planning
- Planned vs actual comparison

### 7. **Document Analytics**
- Document type breakdown
- Status tracking per type
- SLA compliance per type
- Comprehensive statistics

---

## 🔐 Security & Access Control

### Role-Based Access:
```typescript
checkAnalyticsRole(user) {
  if (!['SUPER_ADMIN', 'ADMINISTRATEUR', 'RESPONSABLE_DEPARTEMENT', 
        'CHEF_EQUIPE', 'SCAN', 'BO', 'GESTIONNAIRE'].includes(user.role)) {
    throw new ForbiddenException('Access denied');
  }
}
```

### Data Filtering by Role:
- **GESTIONNAIRE**: Only their assigned data
- **CHEF_EQUIPE**: Their team's data
- **SUPER_ADMIN**: All data

---

## 📈 Performance Metrics Tracked

1. **Bordereaux Metrics**
   - Total count
   - Processed count
   - Pending count
   - Average processing time
   - SLA compliance rate

2. **User Metrics**
   - Documents processed
   - Documents last 24h
   - SLA compliance
   - Average processing time
   - Workload utilization

3. **Department Metrics**
   - SLA compliance
   - Average processing time
   - Total workload
   - Performance trends

4. **OV Metrics**
   - Total OV
   - Executed OV
   - Pending OV
   - Execution rate
   - Average execution time

5. **Document Metrics**
   - Total by type
   - Status breakdown
   - SLA compliance by type
   - Processing times

---

## 🎯 Use Cases

### 1. **Super Admin Dashboard**
- System-wide KPIs
- All departments performance
- Critical alerts
- AI recommendations
- Workforce planning

### 2. **Chef d'Équipe Dashboard**
- Team performance
- Team member workload
- SLA compliance
- Task assignment recommendations

### 3. **Gestionnaire Dashboard**
- Personal performance
- Assigned tasks
- Daily targets
- SLA status

### 4. **Finance Dashboard**
- OV tracking
- Execution rates
- Pending virements
- Financial alerts

### 5. **Executive Dashboard**
- High-level KPIs
- Trend analysis
- Forecasting
- Strategic recommendations

---

## 🔄 Data Flow

```
User Request → Controller → Service → Prisma → Database
                                    ↓
                              AI Microservice
                                    ↓
                              Response Processing
                                    ↓
                              Frontend Display
```

---

## 📦 Dependencies

### Backend:
- `@nestjs/common`
- `@prisma/client`
- `axios` (AI integration)
- `exceljs` (Excel export)
- `pdfkit` (PDF export)
- `fast-csv` (CSV export)

### Frontend:
- `react`
- `axios`
- `recharts` (charts)
- `@mui/material` (UI components)

---

## 🚀 Future Enhancements

1. **Machine Learning Models**
   - Custom ML models for prediction
   - Model retraining automation
   - A/B testing for models

2. **Advanced Visualizations**
   - 3D charts
   - Interactive dashboards
   - Custom report builder

3. **Real-Time Collaboration**
   - Shared dashboards
   - Live annotations
   - Team insights

4. **Mobile Analytics**
   - Mobile-optimized dashboards
   - Push notifications
   - Offline analytics

---

## 📝 Summary

The Analytics module is a comprehensive, AI-powered analytics platform that provides:
- ✅ Real-time monitoring and alerts
- ✅ AI-powered predictions and recommendations
- ✅ Advanced filtering and drill-down
- ✅ Multiple export formats
- ✅ Role-based access control
- ✅ Workforce and resource planning
- ✅ Document and process analytics
- ✅ Executive reporting
- ✅ Performance tracking at all levels

It integrates seamlessly with the AI microservice for advanced analytics and supports all user roles with appropriate data access and visualization.
