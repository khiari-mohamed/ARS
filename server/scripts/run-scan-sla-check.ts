import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ScanSLAService } from '../src/bordereaux/scan-sla.service';

async function runScanSLACheck() {
  console.log('🚀 Starting REAL SCAN SLA Check...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const scanSlaService = app.get(ScanSLAService);

  try {
    // Run the REAL SLA check service
    await scanSlaService.checkScanSLAAndNotify();
    
    console.log('\n✅ SCAN SLA Check Complete!');
    console.log('\n📱 Now check your UI:');
    console.log('   1. Notification bell (top-right) - should show red badge');
    console.log('   2. SCAN Dashboard - should show alerts');
    console.log('   3. Contracts Module - should show alert icons\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

runScanSLACheck();
