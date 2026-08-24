# Production 502 Error Fixes

## Critical Issues Identified

### 1. Database Connection Pool Exhaustion
**Error**: `Too many database connections opened: FATAL: trop de clients sont déjà connectés`

### 2. Memory Leaks
**Error**: PM2 restarts due to exceeding 1GB memory limit (reaching 3.5GB)

### 3. Backend Crashes
**Result**: nginx returns 502 Bad Gateway

---

## IMMEDIATE FIXES

### Fix 1: Update Prisma Connection Pool Settings

Create/Update: `backend/.env` or `backend/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Add connection pooling limits
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["interactiveTransactions"]
  binaryTargets = ["native", "linux-musl", "debian-openssl-1.1.x"]
}
```

### Fix 2: Configure Database Connection String with Pooling

Update `backend/.env`:

```env
# Old format (causing issues)
# DATABASE_URL="postgresql://user:password@localhost:5432/arsdb"

# New format with connection pooling
DATABASE_URL="postgresql://user:password@localhost:5432/arsdb?connection_limit=10&pool_timeout=20&connect_timeout=30"

# Recommended settings:
# connection_limit=10  (limit per instance)
# pool_timeout=20      (20 seconds timeout)
# connect_timeout=30   (30 seconds to establish connection)
```

### Fix 4: Add Prisma Client Singleton

Create: `backend/src/prisma/prisma-client.singleton.ts`

```typescript
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['error', 'warn'],
      // Connection pool settings
      __internal: {
        engine: {
          // Maximum number of connections in the connection pool
          connection_limit: 10,
          // Maximum time to wait for a connection from the pool
          pool_timeout: 20,
        },
      },
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma?.$disconnect();
    });
  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
```

### Fix 5: Update Prisma Service (NestJS)

Update: `backend/src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  // Add connection health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Add method to handle transaction with timeout
  async executeWithTimeout<T>(
    fn: (tx: PrismaClient) => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timeout')), timeoutMs)
    );

    return Promise.race([
      this.$transaction(fn),
      timeoutPromise
    ]);
  }
}
```

### Fix 6: Optimize Dashboard Data Fetching

Update: `backend/src/dashboard/dashboard.controller.ts`

Add timeout and pagination to prevent long-running queries:

```typescript
import { Controller, Get, Query, Timeout } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  
  @Get('role-based')
  @Timeout(30000) // 30 second timeout
  async getRoleBasedDashboard(
    @Query('departmentId') departmentId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('period') period: string = 'day',
  ) {
    try {
      // Add pagination and limits to queries
      const MAX_RECORDS = 1000;
      
      // Implement data fetching with limits
      const data = await this.dashboardService.getRoleBasedData({
        departmentId,
        fromDate,
        toDate,
        period,
        limit: MAX_RECORDS,
      });

      return data;
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      // Return partial data instead of failing completely
      return {
        kpis: {},
        performance: {},
        slaStatus: [],
        alerts: {},
        error: 'Some data unavailable',
        dataSource: 'ERROR_FALLBACK'
      };
    }
  }
}
```

### Fix 7: Update PostgreSQL Configuration

SSH to server and update PostgreSQL config:

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Update these settings:

```conf
# Connection Settings
max_connections = 200                  # Increase from default 100
shared_buffers = 512MB                 # Increase based on available RAM
effective_cache_size = 2GB             # Increase based on available RAM

# Connection Pooling
superuser_reserved_connections = 3
reserved_connections = 10

# Performance
work_mem = 16MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging (for debugging)
log_connections = on
log_disconnections = on
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_min_duration_statement = 5000      # Log slow queries (5s+)
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Fix 8: Add PgBouncer for Connection Pooling (RECOMMENDED)

Install PgBouncer:

```bash
sudo apt-get update
sudo apt-get install pgbouncer
```

Configure PgBouncer:

```bash
sudo nano /etc/pgbouncer/pgbouncer.ini
```

```ini
[databases]
arsdb = host=localhost port=5432 dbname=arsdb

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
log_connections = 1
log_disconnections = 1
```

Update userlist:

```bash
sudo nano /etc/pgbouncer/userlist.txt
```

```
"your_db_user" "your_db_password_md5_hash"
```

Start PgBouncer:

```bash
sudo systemctl start pgbouncer
sudo systemctl enable pgbouncer
```

Update DATABASE_URL to use PgBouncer:

```env
# Old
DATABASE_URL="postgresql://user:password@localhost:5432/arsdb"

# New (through PgBouncer)
DATABASE_URL="postgresql://user:password@localhost:6432/arsdb?pgbouncer=true"
```

---

## DEPLOYMENT STEPS

### Step 1: Stop all PM2 processes

```bash
pm2 stop all
pm2 delete all
```

### Step 2: Clear PM2 logs

```bash
pm2 flush
```

### Step 3: Update environment variables

```bash
cd /home/ars-simulator/backend
nano .env
```

Add the connection pool settings to DATABASE_URL

### Step 4: Update ecosystem.config.js

```bash
cd /home/ars-simulator
nano ecosystem.config.js
```

Apply the configuration from Fix 3 above

### Step 5: Restart services

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Step 6: Monitor logs

```bash
pm2 logs --lines 100
```

### Step 7: Check PostgreSQL connections

```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Step 8: Test the dashboard

Open browser and navigate to your dashboard URL

---

## MONITORING COMMANDS

### Check current connections:

```bash
sudo -u postgres psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### Check PM2 status:

```bash
pm2 status
pm2 monit
```

### Check memory usage:

```bash
pm2 list
free -h
```

### View real-time logs:

```bash
pm2 logs ars-api --lines 50
```

### Check for connection leaks:

```bash
sudo -u postgres psql -c "SELECT pid, usename, application_name, client_addr, state, query_start, state_change FROM pg_stat_activity WHERE datname = 'arsdb' ORDER BY query_start;"
```

---

## LONG-TERM IMPROVEMENTS

### 1. Implement Query Caching (Redis)

```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### 2. Add Database Read Replicas

For read-heavy operations, configure PostgreSQL replicas

### 3. Implement API Rate Limiting

Prevent API abuse that exhausts connections

### 4. Add Health Check Endpoints

```typescript
@Get('health')
async healthCheck() {
  const dbHealthy = await this.prisma.isHealthy();
  return {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
  };
}
```

### 5. Set up Automated Monitoring

- Install Prometheus + Grafana
- Monitor connection pool metrics
- Set up alerts for high memory usage
- Track response times

---

## EMERGENCY RECOVERY

If the system is completely down:

```bash
# 1. Stop all services
pm2 stop all

# 2. Kill all node processes
pkill -9 node

# 3. Restart PostgreSQL
sudo systemctl restart postgresql

# 4. Clear connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'arsdb' AND pid <> pg_backend_pid();"

# 5. Restart services
pm2 start ecosystem.config.js
pm2 save

# 6. Monitor
pm2 logs
```

---

## VERIFICATION CHECKLIST

- [ ] Database connection pool configured (10-25 connections per instance)
- [ ] PM2 memory limit increased to 2GB
- [ ] PM2 running in fork mode (not cluster)
- [ ] PgBouncer installed and configured (recommended)
- [ ] PostgreSQL max_connections increased to 200
- [ ] Timeout added to dashboard endpoint (30s)
- [ ] Health check endpoint implemented
- [ ] Monitoring commands tested
- [ ] Emergency recovery procedure documented
- [ ] Team trained on monitoring and recovery

---

## EXPECTED RESULTS

After implementing these fixes:

1. ✅ No more "too many connections" errors
2. ✅ PM2 processes stable (no memory restarts)
3. ✅ Dashboard loads successfully
4. ✅ 502 errors eliminated
5. ✅ Better overall performance
6. ✅ Connection count stays under control
------------------------------------------------------------------------
THE REAL PROBLEM
WHERE IT'S FAILING:

ars-api (port 5000) is CRASHING due to database connection exhaustion

NOT a code issue - it's a SERVER CONFIGURATION issue

THE ISSUE EXPLAINED:

PM2 in cluster mode = Every restart creates MORE database connections

Memory leak = Process hits 3.5GB (limit 1GB) → PM2 restarts → NEW connections opened → OLD connections NOT closed

Database exhausted = PostgreSQL says "FATAL: too many clients already connected"

ars-api crashes → nginx returns 502 Bad Gateway

Frontend can't load dashboard data

THE FIX IS IN SERVER CONFIG, NOT CODE

QUICK FIX (Run on server):
# 1. Stop ars-api
pm2 stop ars-api

# 2. Kill zombie connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='arsdb' AND pid <> pg_backend_pid();"

# 3. Update ars-api config (change cluster to fork, increase memory)
pm2 delete ars-api
pm2 start /path/to/ars-api/dist/main.js --name ars-api --max-memory-restart 2G -i 1

# 4. Save
pm2 save

Copy
bash
This fixes:

✅ Stops memory leaks

✅ Reduces database connections (1 instance instead of cluster)

✅ No more 502 errors
Perfect! Yes, you can fix it in the .env file. Here's the step-by-step fix:

STEP-BY-STEP FIX
Step 1: Update DATABASE_URL in .env
Change this line:

DATABASE_URL="postgresql://postgres:23044943@localhost:5432/ars_db"

Copy
env
To this (add connection pooling):

DATABASE_URL="postgresql://postgres:23044943@localhost:5432/ars_db?connection_limit=10&pool_timeout=20&connect_timeout=30"

Copy
env
Step 2: Add these new lines to .env
Add these at the end of your .env file:

# Database Connection Pooling
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE=10000

Copy
env
Step 3: On the server, restart ars-api with new config
# Stop current ars-api
pm2 stop ars-api

# Delete it
pm2 delete ars-api

# Start with new settings (1 instance, 2GB memory)
pm2 start npm --name "ars-api" -- start -- --max-memory-restart 2G -i 1

# OR if you use direct script:
pm2 start dist/main.js --name "ars-api" --max-memory-restart 2G -i 1

# Save the config
pm2 save

Copy
bash
Step 4: Clean database connections
# Kill all existing connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ars_db' AND pid <> pg_backend_pid();"

Copy
bash
Step 5: Check it's working
# Check PM2 status
pm2 status

# Monitor logs
pm2 logs ars-api --lines 50

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='ars_db';"

Copy
bash
WHAT EACH CHANGE DOES:
connection_limit=10 = Maximum 10 connections per app instance

pool_timeout=20 = Wait 20 seconds for a connection from the pool

connect_timeout=30 = 30 seconds to establish initial connection

-i 1 = Run only 1 instance (not cluster mode)

--max-memory-restart 2G = Restart if memory exceeds 2GB (not 1GB)

VERIFY IT WORKS:
After restarting, open your dashboard. You should NOT see 502 errors anymore.

If you still see errors, run:

pm2 logs ars-api

Copy
bash
And tell me what you see.



@Pin Context
+1

Rules

Claude Sonnet 4.5

Claude Sonnet 4.5

