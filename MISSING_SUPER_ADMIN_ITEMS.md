# MISSING ITEMS for 100% Super Admin Compliance

## 1. Missing Components in SuperAdminDashboard.tsx:
```typescript
// ADD THESE IMPORTS:
import ChefEquipeGlobalBasket from '../components/ChefEquipeGlobalBasket';
import { ChefEquipeCorbeille } from '../components/Workflow/ChefEquipeCorbeille';
import { ChefEquipeActionButtons } from '../components/Workflow/ChefEquipeActionButtons';

// ADD THESE TABS:
<Tab label="📊 Vue Globale" />
<Tab label="📋 Corbeille Équipe" />  
<Tab label="⚡ Actions Rapides" />

// ADD THESE TAB PANELS:
<TabPanel value={activeTab} index={X}>
  <ChefEquipeGlobalBasket globalView={true} />
</TabPanel>
<TabPanel value={activeTab} index={Y}>
  <ChefEquipeCorbeille globalView={true} />
</TabPanel>
<TabPanel value={activeTab} index={Z}>
  <ChefEquipeActionButtons globalView={true} />
</TabPanel>
```

## 2. Missing Backend Endpoints:
```typescript
// NEED THESE SUPER ADMIN ENDPOINTS:
GET /super-admin/bordereaux/all-teams
GET /super-admin/clients/all-visibility
GET /super-admin/contracts/all-contracts
GET /super-admin/gestionnaires/all-assignments
```

## 3. Missing Global View Props:
```typescript
// ChefEquipeGlobalBasket needs globalView prop
// ChefEquipeCorbeille needs globalView prop  
// ChefEquipeActionButtons needs globalView prop
```

## Current Status: 40% Complete
## Missing: 60% (Chef d'équipe module integration)