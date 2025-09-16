import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { TuniclaimService } from './tuniclaim.service';
import { Public } from '../auth/public.decorator';

@Controller('integrations/tuniclaim')
export class TuniclaimController {
  constructor(private readonly tuniclaimService: TuniclaimService) {}

  /**
   * Manual sync trigger
   */
  @Post('sync')
  @Public()
  async triggerSync() {
    try {
      const result = await this.tuniclaimService.syncBs();
      return {
        success: true,
        ...result,
        message: result.errors > 0 
          ? `Synchronisation terminée avec ${result.errors} erreur(s). ${result.imported} bordereaux importés.`
          : `Synchronisation réussie! ${result.imported} bordereaux importés.`
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        errors: 1,
        error: error.message,
        message: 'Erreur lors de la synchronisation avec MY TUNICLAIM'
      };
    }
  }

  /**
   * Get sync status and history
   */
  @Get('status')
  @Public()
  async getSyncStatus() {
    try {
      const logs = await this.tuniclaimService.getSyncLogs(10);
      const status = this.tuniclaimService.getSyncStatus();
      
      return {
        ...status,
        logs
      };
    } catch (error) {
      return {
        lastSync: null,
        lastResult: null,
        isHealthy: false,
        logs: [],
        error: error.message
      };
    }
  }

  /**
   * Get detailed sync logs
   */
  @Get('logs')
  @Public()
  async getSyncLogs(@Query('limit') limit?: string) {
    const logLimit = limit ? parseInt(limit) : 20;
    return this.tuniclaimService.getSyncLogs(logLimit);
  }

  /**
   * Push status update to MY TUNICLAIM
   */
  @Post('push-status')
  @Public()
  async pushStatusUpdate(@Body() body: { bordereauId: string; statusData: any }) {
    try {
      await this.tuniclaimService.pushStatusUpdate(body.bordereauId, body.statusData);
      return {
        success: true,
        message: 'Status update pushed to MY TUNICLAIM successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to push status update to MY TUNICLAIM'
      };
    }
  }

  /**
   * Push payment update to MY TUNICLAIM
   */
  @Post('push-payment')
  @Public()
  async pushPaymentUpdate(@Body() body: { bordereauId: string; paymentData: any }) {
    try {
      await this.tuniclaimService.pushPaymentUpdate(body.bordereauId, body.paymentData);
      return {
        success: true,
        message: 'Payment update pushed to MY TUNICLAIM successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to push payment update to MY TUNICLAIM'
      };
    }
  }

  /**
   * Fetch specific bordereau details from MY TUNICLAIM
   */
  @Get('bordereau/:id')
  @Public()
  async getBordereauDetails(@Param('id') bordereauId: string) {
    try {
      const details = await this.tuniclaimService.fetchBsDetails(bordereauId);
      return {
        success: true,
        data: details
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch bordereau details from MY TUNICLAIM'
      };
    }
  }

  /**
   * Test connection to MY TUNICLAIM
   */
  @Get('test-connection')
  @Public()
  async testConnection() {
    try {
      await this.tuniclaimService.fetchBsList();
      return {
        success: true,
        message: 'Connection to MY TUNICLAIM successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to MY TUNICLAIM'
      };
    }
  }
}