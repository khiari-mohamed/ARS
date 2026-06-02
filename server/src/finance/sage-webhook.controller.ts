/**
 * FILE: D:\ARS\server\src\finance\sage-webhook.controller.ts
 *
 * Dedicated controller for SAGE → GED callbacks.
 *
 * WHY a separate controller?
 *  • The main FinanceController is protected by JwtAuthGuard.
 *  • SAGE calls this endpoint without a user token.
 *  • Security is provided instead by HMAC-SHA256 signature verification
 *    (or Bearer token fallback) — both handled inside the service.
 *
 * Route: POST /api/finance/sage/webhook/result
 *
 * SAGE team needs to:
 *  1. Set the webhook URL to: <SERVER_URL>/api/finance/sage/webhook/result
 *  2. Sign each request using HMAC-SHA256 over the raw JSON body,
 *     send the hex digest as:  X-Sage-Signature: sha256=<hex>
 *     — OR use simple Bearer:  Authorization: Bearer <SAGE_WEBHOOK_SECRET>
 *  3. Always send Content-Type: application/json
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  Headers,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { Response } from 'express';
import { Public }   from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard }   from '../auth/roles.guard';
import { Roles }        from '../auth/roles.decorator';
import { UserRole }     from '../auth/user-role.enum';
import { SageApiIntegrationService, SageWebhookPayload } from './sage-api-integration.service';

@Controller('finance/sage/webhook')
export class SageWebhookController {
  constructor(
    private readonly sageApiIntegrationService: SageApiIntegrationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC — Receive webhook callback from SAGE
  // Secured via HMAC signature / Bearer token inside the service,
  // NOT via JWT (SAGE has no user session).
  // ─────────────────────────────────────────────────────────────────────────

  @Post('result')
  @Public()          // Bypass JwtAuthGuard
  @HttpCode(200)     // Always 200 so SAGE doesn't retry on auth errors
  async receiveWebhook(
    @Body()    body:     SageWebhookPayload,
    @Req()     req:      any,
    @Headers('x-sage-signature')  xSageSignature:  string,
    @Headers('authorization')     authorization:   string,
  ) {
    // Determine which auth header was provided
    const signatureHeader = xSageSignature || authorization || '';

    // Rebuild raw body for signature verification.
    // Note: for 100% accurate HMAC, configure express rawBody middleware
    // (see main.ts note below). JSON.stringify is accurate when SAGE
    // sends compact JSON with consistent key order — covers most SDKs.
    const rawBody = JSON.stringify(body);

    const sourceIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      'unknown';

    const result = await this.sageApiIntegrationService.handleWebhookResult(
      body,
      signatureHeader,
      rawBody,
      sourceIp,
    );

    // Always return 200 with a body — SAGE must not retry on our errors
    return {
      received:    result.received,
      processed:   result.processed,
      message:     result.message,
      timestamp:   new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROTECTED — Admin endpoints (require JWT + SUPER_ADMIN role)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/finance/sage/webhook/info
   * Returns the webhook URL and all setup instructions for the SAGE team.
   */
  @Get('info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE)
  getWebhookInfo() {
    return this.sageApiIntegrationService.getWebhookInfo();
  }

  /**
   * GET /api/finance/sage/webhook/logs
   * Paginated log of all received webhook calls (audit trail).
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE)
  async getWebhookLogs(
    @Query('page')     page?:     string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sageApiIntegrationService.getWebhookLogs(
      page     ? parseInt(page,     10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * POST /api/finance/sage/webhook/test-receive
   * Admin sends a mock payload to test the webhook pipeline without needing SAGE.
   * Useful for verifying signature config and status update logic.
   */
  @Post('test-receive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(200)
  async testReceive(@Body() body: {
    transactionId:   string;
    ordreVirementId: string;
    status:          string;
    message?:        string;
  }) {
    const mockPayload: SageWebhookPayload = {
      event:           `IMPORT_${(body.status ?? 'COMPLETED').toUpperCase()}`,
      transactionId:   body.transactionId,
      ordreVirementId: body.ordreVirementId,
      status:          body.status ?? 'COMPLETED',
      message:         body.message ?? 'Test webhook from admin panel',
      processedAt:     new Date().toISOString(),
    };

    // Skip signature for admin test
    return this.sageApiIntegrationService.handleWebhookResult(
      mockPayload,
      '', // empty signature — service allows if no secret configured
      JSON.stringify(mockPayload),
      '127.0.0.1',
    );
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * OPTIONAL — Add to D:\ARS\server\src\main.ts for accurate raw-body HMAC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Insert BEFORE app.use(express.json()):
 *
 *   import * as express from 'express';
 *
 *   // Capture raw body for webhook signature verification
 *   app.use(
 *     '/api/finance/sage/webhook',
 *     express.raw({ type: 'application/json' }),
 *     (req: any, _res: any, next: any) => {
 *       if (Buffer.isBuffer(req.body)) {
 *         req.rawBody = req.body.toString('utf8');
 *         req.body    = JSON.parse(req.rawBody);
 *       }
 *       next();
 *     },
 *   );
 *
 * Then in the receiveWebhook method above, replace:
 *   const rawBody = JSON.stringify(body);
 * with:
 *   const rawBody = req.rawBody ?? JSON.stringify(body);
 * ═══════════════════════════════════════════════════════════════════════════
 */