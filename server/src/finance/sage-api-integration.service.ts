/**
 * FILE: D:\ARS\server\src\finance\sage-api-integration.service.ts
 *
 * SAGE API Integration Service — Bidirectional, Production Ready
 *
 * Config priority (highest → lowest):
 *   1. DB (SageConfigStore) — set from the frontend by SUPER_ADMIN, no developer needed
 *   2. .env file            — re-parsed on every reloadConfig() call (hot-reload)
 *   3. Defaults             — safe fallbacks that keep the system running gracefully
 *
 * SEND    (GED → SAGE): integrateOrdreVirement, integrateBatch
 * RECEIVE (SAGE → GED): handleWebhookResult  ← called by SageWebhookController
 * POLL    (GED → SAGE): pollPendingIntegrations ← auto setInterval every N min
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService }            from '../prisma/prisma.service';
import { SageTxtGenerationService } from './sage-txt-generation.service';
import { StatutGlobalService }      from './statut-global.service';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path   from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SageApiConfig {
  apiUrl:              string;
  apiKey:              string;
  timeout:             number;
  retryAttempts:       number;
  webhookSecret:       string;
  pollIntervalMinutes: number;
  configured:          boolean;
}

export interface SageIntegrationResult {
  success:            boolean;
  configured:         boolean;
  sageTransactionId?: string;
  message:            string;
  errors?:            string[];
  integratedAt?:      Date;
  integrationId?:     string;
}

export interface SageBatchResult {
  totalFiles:   number;
  successCount: number;
  failureCount: number;
  results: Array<{
    ordreVirementId:    string;
    integrationId?:     string;
    success:            boolean;
    sageTransactionId?: string;
    error?:             string;
  }>;
}

export interface SageWebhookPayload {
  event:             string;
  transactionId?:    string;
  ordreVirementId?:  string;
  status:            string;
  message?:          string;
  errorCode?:        string;
  entriesCreated?:   number;
  processedAt?:      string;
}

export interface SageIntegrationFilter {
  status?:           'SUCCESS' | 'FAILED' | 'PENDING';
  ordreVirementId?:  string;
  dateFrom?:         string;
  dateTo?:           string;
  search?:           string;
  page?:             number;
  pageSize?:         number;
}

export interface SageIntegrationStats {
  total:               number;
  success:             number;
  failed:              number;
  pending:             number;
  successRate:         number;
  lastIntegratedAt?:   Date;
  lastWebhookAt?:      Date;
  configured:          boolean;
  pollingActive:       boolean;
  pollIntervalMinutes: number;
}

export interface SageConfigUpdatePayload {
  apiUrl?:          string;
  apiKey?:          string | null;
  webhookSecret?:   string | null;
  timeout?:         number;
  retryAttempts?:   number;
  pollIntervalMin?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sentinels — URLs that indicate "not yet configured"
// ─────────────────────────────────────────────────────────────────────────────

const UNCONFIGURED_URLS = new Set([
  '',
  'http://localhost:8080/sage-api',
  'http://your-sage-server/api',
  'https://your-sage-server/api',
  'YOUR_SAGE_API_URL',
]);

function isConfigured(url: string): boolean {
  return Boolean(url) && !UNCONFIGURED_URLS.has(url.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SageApiIntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SageApiIntegrationService.name);

  private axiosInstance!: AxiosInstance;
  private config!:        SageApiConfig;
  private pollingTimer:   NodeJS.Timeout | null = null;
  private pollingActive   = false;

  constructor(
    private readonly prisma:              PrismaService,
    private readonly sageTxtService:      SageTxtGenerationService,
    private readonly statutGlobalService: StatutGlobalService,
  ) {
    // Sync init from .env only — DB is not available yet in constructor
    this.reloadConfigFromEnv();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    // Full reload: re-reads .env AND overrides with DB config, then starts polling
    await this.reloadConfig();
  }

  onModuleDestroy(): void {
    this.stopPolling();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIG — hot-reload without server restart
  // Priority: DB > .env > hardcoded defaults
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sync — safe to call in constructor.
   * Re-parses the .env file so changes to SAGE_API_URL etc. are picked up
   * immediately after /sage/config/reload without a server restart.
   */
  private reloadConfigFromEnv(): void {
    try {
      // override:true → updates process.env in-place with current file contents.
      // In containers the .env file won't exist — dotenv skips it silently and
      // process.env already has the injected values. The try/catch covers that.
      dotenv.config({
        path:     path.resolve(process.cwd(), '.env'),
        override: true,
      });
    } catch {
      // Container / cloud env — vars injected directly, safe to ignore.
    }

    const rawUrl = (process.env.SAGE_API_URL ?? '').trim();

    this.config = {
      apiUrl:              rawUrl || 'http://localhost:8080/sage-api',
      apiKey:              (process.env.SAGE_API_KEY              ?? '').trim(),
      timeout:             Math.max(5_000, parseInt(process.env.SAGE_API_TIMEOUT              ?? '30000', 10)),
      retryAttempts:       Math.min(5, Math.max(1, parseInt(process.env.SAGE_API_RETRY_ATTEMPTS ?? '3',     10))),
      webhookSecret:       (process.env.SAGE_WEBHOOK_SECRET       ?? '').trim(),
      pollIntervalMinutes: Math.max(1, parseInt(process.env.SAGE_POLL_INTERVAL_MINUTES ?? '5', 10)),
      configured:          isConfigured(rawUrl),
    };

    this.rebuildAxios();
  }

  /**
   * Async — reads the SageConfigStore singleton row and overrides env values.
   * DB config wins, so frontend-entered values always take precedence over .env.
   */
  private async reloadConfigFromDb(): Promise<void> {
    try {
      const stored = await this.prisma.sageConfigStore.findUnique({
        where: { id: 'SINGLETON' },
      });

      if (!stored) return; // no DB config yet — .env values stand

      // Only override fields that are actually set in DB (null means "use env fallback")
      const effectiveUrl = stored.apiUrl?.trim() ?? '';

      this.config = {
        apiUrl:              effectiveUrl              || this.config.apiUrl,
        apiKey:              stored.apiKey             ?? this.config.apiKey,
        timeout:             stored.timeout            ?? this.config.timeout,
        retryAttempts:       stored.retryAttempts      ?? this.config.retryAttempts,
        webhookSecret:       stored.webhookSecret      ?? this.config.webhookSecret,
        pollIntervalMinutes: stored.pollIntervalMin    ?? this.config.pollIntervalMinutes,
        configured:          isConfigured(effectiveUrl || this.config.apiUrl),
      };

      this.rebuildAxios();
    } catch (err: any) {
      // DB might not be ready on first boot — env values act as safe fallback
      this.logger.warn(`[reloadConfig] DB read skipped (using .env fallback): ${err.message}`);
    }
  }

  /** Rebuilds the axios instance whenever config values change. */
  private rebuildAxios(): void {
    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
      },
    });
  }

  /**
   * PUBLIC async hot-reload — call this after editing .env OR after updateConfig().
   * Re-parses .env file, then overrides with DB values, then restarts the poller.
   * Exposed to the controller via POST /finance/sage/config/reload.
   */
  async reloadConfig(): Promise<void> {
    this.reloadConfigFromEnv();
    await this.reloadConfigFromDb();

    // Restart poller in case the interval changed
    this.stopPolling();
    this.startPolling();

    if (this.config.configured) {
      this.logger.log(
        `SAGE API configured → ${this.config.apiUrl} | poll every ${this.config.pollIntervalMinutes}m`,
      );
    } else {
      this.logger.warn(
        'SAGE_API_URL not configured — integration calls return structured errors until configured via UI or .env.',
      );
    }
  }

  /**
   * Save config from frontend to DB, then hot-reload.
   * Secrets: null = clear, undefined/omitted = keep existing, string = set new value.
   * Called by PUT /finance/sage/config (SUPER_ADMIN only).
   */
  async updateConfig(
    data: SageConfigUpdatePayload,
    userId: string,
  ): Promise<{
    configured: boolean;
    message:    string;
    config:     ReturnType<SageApiIntegrationService['getConfig']>;
  }> {
    const upsertData: Record<string, any> = { updatedById: userId };

    // Plain fields — always update when provided
    if (data.apiUrl          !== undefined) upsertData.apiUrl         = data.apiUrl?.trim() ?? null;
    if (data.timeout         !== undefined) upsertData.timeout        = Math.max(5_000, data.timeout);
    if (data.retryAttempts   !== undefined) upsertData.retryAttempts  = Math.min(5, Math.max(1, data.retryAttempts));
    if (data.pollIntervalMin !== undefined) upsertData.pollIntervalMin = Math.max(1, data.pollIntervalMin);

    // Secret fields — null = explicit clear, string = set new, undefined = keep (omit from upsert)
    if (data.apiKey !== undefined) {
      upsertData.apiKey = data.apiKey; // null clears, string sets
    }
    if (data.webhookSecret !== undefined) {
      upsertData.webhookSecret = data.webhookSecret;
    }

    await this.prisma.sageConfigStore.upsert({
      where:  { id: 'SINGLETON' },
      create: { id: 'SINGLETON', ...upsertData },
      update: upsertData,
    });

    await this.reloadConfig();

    this.logger.log(`[config] Updated by user ${userId} — configured=${this.config.configured}`);

    return {
      configured: this.config.configured,
      message:    this.config.configured
        ? `SAGE API configured → ${this.config.apiUrl}`
        : 'Configuration saved. Add a valid SAGE API URL to enable integration.',
      config: this.getConfig(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND — Single OV (real-time)
  // ─────────────────────────────────────────────────────────────────────────

  async integrateOrdreVirement(
    ordreVirementId: string,
    userId:          string,
    templateId?:     string,
  ): Promise<SageIntegrationResult> {
    this.logger.log(`[integrate] OV=${ordreVirementId} user=${userId}`);

    if (!this.config.configured) {
      const rec = await this.persistRecord(ordreVirementId, userId, {
        status:       'FAILED',
        errorMessage: 'SAGE_API_URL not configured. Configure it in the Finance → SAGE Integration → Config panel.',
      });
      return {
        success: false, configured: false,
        message: 'SAGE API URL is not configured. A SUPER_ADMIN can set it in the SAGE Integration panel without restarting the server.',
        integrationId: rec.id,
      };
    }

    try {
      const txt = await this.sageTxtService.generateForOrdreVirement(
        ordreVirementId, userId, templateId,
      );

      const apiResult = await this.sendToSage(
        ordreVirementId, txt.content, txt.fileName, txt.codeJournal,
      );

      const finalStatus = (apiResult.success && (process.env.SAGE_INTEGRATION_SYNC ?? 'false') === 'true')
        ? 'SUCCESS'
        : apiResult.success ? 'PENDING' : 'FAILED';

      const rec = await this.persistRecord(ordreVirementId, userId, {
        status:            finalStatus,
        sageTransactionId: apiResult.sageTransactionId,
        errorMessage:      finalStatus === 'FAILED' ? apiResult.message : undefined,
        txtContent:        txt.content,
        fileName:          txt.fileName,
      });

      if (finalStatus === 'SUCCESS') {
        await this.statutGlobalService.markAsSageIntegrated(ordreVirementId);
      }

      return { ...apiResult, configured: true, integrationId: rec.id };
    } catch (err: any) {
      this.logger.error(`[integrate] OV=${ordreVirementId}: ${err.message}`);
      const rec = await this.persistRecord(ordreVirementId, userId, {
        status: 'FAILED', errorMessage: err.message,
      });
      return {
        success: false, configured: true,
        message: `Integration failed: ${err.message}`,
        errors:  [err.message], integrationId: rec.id,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND — Batch
  // ─────────────────────────────────────────────────────────────────────────

  async integrateBatch(
    ordreVirementIds: string[],
    userId:           string,
    templateId?:      string,
  ): Promise<SageBatchResult> {
    this.logger.log(`[batch] Processing ${ordreVirementIds.length} OVs`);

    const result: SageBatchResult = {
      totalFiles: ordreVirementIds.length,
      successCount: 0, failureCount: 0, results: [],
    };

    for (const ovId of ordreVirementIds) {
      try {
        const r = await this.integrateOrdreVirement(ovId, userId, templateId);
        result.results.push({
          ordreVirementId: ovId, integrationId: r.integrationId,
          success: r.success, sageTransactionId: r.sageTransactionId,
          error: r.success ? undefined : r.message,
        });
        r.success ? result.successCount++ : result.failureCount++;
      } catch (err: any) {
        result.results.push({ ordreVirementId: ovId, success: false, error: err.message });
        result.failureCount++;
      }
    }

    this.logger.log(
      `[batch] Done — sent:${result.totalFiles} accepted:${result.successCount} failed:${result.failureCount}`,
    );
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECEIVE — Webhook from SAGE (called by SageWebhookController)
  // ─────────────────────────────────────────────────────────────────────────

  async handleWebhookResult(
    payload:         SageWebhookPayload,
    signatureHeader: string,
    rawBody:         string,
    sourceIp?:       string,
  ): Promise<{ received: boolean; processed: boolean; message: string }> {

    const logId = await this.logWebhook(payload, sourceIp);

    const signatureValid = this.verifyWebhookSignature(rawBody, signatureHeader);

    if (!signatureValid) {
      await this.updateWebhookLog(logId, {
        signatureValid:  false,
        processingError: 'Signature mismatch — request rejected',
      });
      this.logger.warn(`[webhook] Rejected — invalid signature from ${sourceIp}`);
      return { received: true, processed: false, message: 'Invalid signature' };
    }

    try {
      const { transactionId, ordreVirementId, status, message, errorCode } = payload;

      const conditions: any[] = [];
      if (transactionId)   conditions.push({ sageTransactionId: transactionId });
      if (ordreVirementId) conditions.push({ ordreVirementId });

      const integration = conditions.length
        ? await this.prisma.sageIntegration.findFirst({
            where:   { OR: conditions },
            orderBy: { integratedAt: 'desc' },
          })
        : null;

      if (!integration) {
        const errMsg = `No integration found: transactionId=${transactionId} ovId=${ordreVirementId}`;
        await this.updateWebhookLog(logId, { signatureValid: true, processed: false, processingError: errMsg });
        this.logger.warn(`[webhook] ${errMsg}`);
        return { received: true, processed: false, message: errMsg };
      }

      const newStatus = this.mapSageStatus(status);

      await this.prisma.sageIntegration.update({
        where: { id: integration.id },
        data: {
          status:            newStatus,
          sageTransactionId: transactionId ?? integration.sageTransactionId,
          errorMessage:
            newStatus === 'FAILED'
              ? (message ?? errorCode ?? 'SAGE reported failure')
              : null,
        },
      });

      if (newStatus === 'SUCCESS') {
        await this.statutGlobalService.markAsSageIntegrated(integration.ordreVirementId);
        this.logger.log(
          `[webhook] OV=${integration.ordreVirementId} confirmed INTEGRE_SAGE by SAGE webhook`,
        );
      }

      await this.updateWebhookLog(logId, {
        sageTransactionId: transactionId,
        ordreVirementId:   integration.ordreVirementId,
        signatureValid:    true,
        processed:         true,
      });

      return { received: true, processed: true, message: `Status updated to ${newStatus}` };
    } catch (err: any) {
      await this.updateWebhookLog(logId, { processed: false, processingError: err.message });
      this.logger.error(`[webhook] Processing error: ${err.message}`);
      return { received: true, processed: false, message: `Processing error: ${err.message}` };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POLL — Auto-check PENDING integrations against SAGE status endpoint
  // ─────────────────────────────────────────────────────────────────────────

  async pollPendingIntegrations(): Promise<{ checked: number; updated: number; errors: number }> {
    if (!this.config.configured) {
      this.logger.debug('[poll] Skipped — SAGE API not configured');
      return { checked: 0, updated: 0, errors: 0 };
    }

    const pending = await this.prisma.sageIntegration.findMany({
      where: {
        status:            'PENDING',
        sageTransactionId: { not: null },
        integratedAt:      { lt: new Date(Date.now() - 30_000) },
      },
      select: { id: true, sageTransactionId: true, ordreVirementId: true },
      take: 50,
    });

    if (!pending.length) {
      this.logger.debug('[poll] No pending integrations');
      return { checked: 0, updated: 0, errors: 0 };
    }

    this.logger.log(`[poll] Checking ${pending.length} pending integrations`);
    let updated = 0;
    let errors  = 0;

    for (const rec of pending) {
      try {
        const res      = await this.axiosInstance.get(`/api/accounting/status/${rec.sageTransactionId}`);
        const newStatus = this.mapSageStatus(res.data.status);

        if (newStatus !== 'PENDING') {
          await this.prisma.sageIntegration.update({
            where: { id: rec.id },
            data: {
              status:       newStatus,
              errorMessage: newStatus === 'FAILED' ? (res.data.message ?? 'SAGE reported failure') : null,
            },
          });

          if (newStatus === 'SUCCESS') {
            await this.statutGlobalService.markAsSageIntegrated(rec.ordreVirementId);
            this.logger.log(`[poll] OV=${rec.ordreVirementId} confirmed INTEGRE_SAGE`);
          }
          updated++;
        }
      } catch (err: any) {
        this.logger.warn(`[poll] Failed to check ${rec.sageTransactionId}: ${err.message}`);
        errors++;
      }
    }

    this.logger.log(
      `[poll] Cycle done — checked:${pending.length} updated:${updated} errors:${errors}`,
    );
    return { checked: pending.length, updated, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ — Paginated integration list with filters
  // ─────────────────────────────────────────────────────────────────────────

  async getAllIntegrations(filters: SageIntegrationFilter = {}): Promise<{
    data: any[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page     = Math.max(1,   filters.page     ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const skip     = (page - 1) * pageSize;
    const where: any = {};

    if (filters.status)          where.status          = filters.status;
    if (filters.ordreVirementId) where.ordreVirementId = filters.ordreVirementId;

    if (filters.dateFrom || filters.dateTo) {
      where.integratedAt = {};
      if (filters.dateFrom) where.integratedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo)   where.integratedAt.lte = new Date(filters.dateTo);
    }

    if (filters.search) {
      where.OR = [
        { sageTransactionId: { contains: filters.search, mode: 'insensitive' } },
        { ordreVirement: { reference: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.sageIntegration.findMany({
        where, skip, take: pageSize, orderBy: { integratedAt: 'desc' },
        include: {
          ordreVirement: {
            select: {
              id: true, reference: true, montantTotal: true, clientName: true,
              client: { select: { id: true, name: true } },
            },
          },
          integratedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.sageIntegration.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ — History for one OV
  // ─────────────────────────────────────────────────────────────────────────

  async getIntegrationHistory(ordreVirementId: string): Promise<any[]> {
    return this.prisma.sageIntegration.findMany({
      where:   { ordreVirementId },
      orderBy: { integratedAt: 'desc' },
      include: { integratedBy: { select: { id: true, fullName: true, email: true } } },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ — Webhook logs
  // ─────────────────────────────────────────────────────────────────────────

  async getWebhookLogs(page = 1, pageSize = 20): Promise<{
    data: any[]; total: number; totalPages: number;
  }> {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.sageWebhookLog.findMany({ skip, take: pageSize, orderBy: { receivedAt: 'desc' } }),
      this.prisma.sageWebhookLog.count(),
    ]);
    return { data, total, totalPages: Math.ceil(total / pageSize) };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ — Live status from SAGE
  // ─────────────────────────────────────────────────────────────────────────

  async checkIntegrationStatus(sageTransactionId: string): Promise<any> {
    if (!this.config.configured) {
      return { configured: false, message: 'SAGE API URL not configured.' };
    }
    try {
      const res = await this.axiosInstance.get(`/api/accounting/status/${sageTransactionId}`);
      return { configured: true, ...res.data };
    } catch (err: any) {
      throw new BadRequestException(`SAGE status check failed: ${this.extractErrorMessage(err)}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE — Retry a failed/pending record
  // ─────────────────────────────────────────────────────────────────────────

  async retryIntegration(integrationId: string, userId: string): Promise<SageIntegrationResult> {
    const existing = await this.prisma.sageIntegration.findUnique({
      where:   { id: integrationId },
      include: { ordreVirement: { select: { id: true } } },
    });

    if (!existing)                     throw new NotFoundException(`Integration ${integrationId} not found`);
    if (existing.status === 'SUCCESS') throw new BadRequestException('Cannot retry a successful integration.');

    await this.prisma.sageIntegration.delete({ where: { id: integrationId } });
    return this.integrateOrdreVirement(existing.ordreVirementId, userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE — Remove a failed/pending record (audit-safe: SUCCESS is protected)
  // ─────────────────────────────────────────────────────────────────────────

  async deleteIntegration(integrationId: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.sageIntegration.findUnique({ where: { id: integrationId } });

    if (!existing)                     throw new NotFoundException(`Integration ${integrationId} not found`);
    if (existing.status === 'SUCCESS') {
      throw new BadRequestException(
        'Cannot delete a successful integration — audit traceability is protected.',
      );
    }

    await this.prisma.sageIntegration.delete({ where: { id: integrationId } });
    this.logger.warn(`[delete] Integration ${integrationId} deleted`);
    return { success: true, message: 'Record deleted.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ — Statistics
  // ─────────────────────────────────────────────────────────────────────────

  async getStats(): Promise<SageIntegrationStats> {
    const [total, success, failed, pending, lastInt, lastWebhook] = await Promise.all([
      this.prisma.sageIntegration.count(),
      this.prisma.sageIntegration.count({ where: { status: 'SUCCESS' } }),
      this.prisma.sageIntegration.count({ where: { status: 'FAILED'  } }),
      this.prisma.sageIntegration.count({ where: { status: 'PENDING' } }),
      this.prisma.sageIntegration.findFirst({
        where: { status: 'SUCCESS' }, orderBy: { integratedAt: 'desc' }, select: { integratedAt: true },
      }),
      this.prisma.sageWebhookLog.findFirst({
        where: { processed: true }, orderBy: { receivedAt: 'desc' }, select: { receivedAt: true },
      }),
    ]);

    return {
      total, success, failed, pending,
      successRate:         total > 0 ? Math.round((success / total) * 100) : 0,
      lastIntegratedAt:    lastInt?.integratedAt,
      lastWebhookAt:       lastWebhook?.receivedAt,
      configured:          this.config.configured,
      pollingActive:       this.pollingActive,
      pollIntervalMinutes: this.config.pollIntervalMinutes,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTIL — Test connection
  // ─────────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<{
    success: boolean; configured: boolean; message: string; latencyMs?: number; sageVersion?: string;
  }> {
    if (!this.config.configured) {
      return {
        success: false, configured: false,
        message: 'SAGE_API_URL not configured. Set it in the SAGE Integration config panel or in .env and reload.',
      };
    }
    const start = Date.now();
    try {
      const res = await this.axiosInstance.get('/api/health');
      return {
        success: true, configured: true, message: 'SAGE API connection successful',
        latencyMs: Date.now() - start, sageVersion: res.data?.version,
      };
    } catch (err: any) {
      return {
        success: false, configured: true,
        message: `Connection failed: ${this.extractErrorMessage(err)}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTIL — Masked config for admin UI
  // ─────────────────────────────────────────────────────────────────────────

  getConfig() {
    return {
      apiUrl:              this.config.configured ? this.config.apiUrl : '',
      apiKey:              this.config.apiKey        ? '***HIDDEN***' : '',
      webhookSecret:       this.config.webhookSecret ? '***HIDDEN***' : '',
      timeout:             this.config.timeout,
      retryAttempts:       this.config.retryAttempts,
      pollIntervalMinutes: this.config.pollIntervalMinutes,
      configured:          this.config.configured,
      // Boolean helpers so frontend can show "key is set" without exposing the value
      hasApiKey:           Boolean(this.config.apiKey),
      hasWebhookSecret:    Boolean(this.config.webhookSecret),
      pollingActive:       this.pollingActive,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTIL — Webhook info (URL + instructions to hand to SAGE team)
  // ─────────────────────────────────────────────────────────────────────────

  getWebhookInfo(): object {
    const serverUrl = (process.env.SERVER_URL ?? 'http://localhost:5000').replace(/\/$/, '');
    return {
      webhookUrl:       `${serverUrl}/api/finance/sage/webhook/result`,
      method:           'POST',
      contentType:      'application/json',
      authMethod:       this.config.webhookSecret
        ? 'HMAC-SHA256 signature OR Bearer token'
        : 'None (SAGE_WEBHOOK_SECRET not set — any call is accepted)',
      signatureHeader:  'X-Sage-Signature',
      signatureFormat:  'sha256=<hmac_sha256_hex>  OR  Bearer <secret>',
      secretConfigured: Boolean(this.config.webhookSecret),
      supportedEvents:  ['IMPORT_COMPLETED', 'IMPORT_FAILED', 'IMPORT_PROCESSING'],
      expectedPayloadExample: {
        event:           'IMPORT_COMPLETED',
        transactionId:   'SAGE-TXN-xxxxx',
        ordreVirementId: 'GED-OV-UUID',
        status:          'COMPLETED',
        message:         'Accounting entries imported successfully',
        entriesCreated:  2,
        processedAt:     new Date().toISOString(),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — HTTP dispatch with retry + exponential backoff
  // ─────────────────────────────────────────────────────────────────────────

  private async sendToSage(
    ordreVirementId: string,
    txtContent:      string,
    fileName:        string,
    codeJournal:     string,
  ): Promise<SageIntegrationResult> {
    let lastErr: any;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.logger.log(
          `[sendToSage] Attempt ${attempt}/${this.config.retryAttempts} OV=${ordreVirementId}`,
        );
        const res = await this.axiosInstance.post('/api/accounting/import', {
          ordreVirementId, fileName, codeJournal,
          content: txtContent, timestamp: new Date().toISOString(),
        });

        if (res.data?.success) {
          return {
            success: true, configured: true,
            sageTransactionId: res.data.transactionId,
            message:           res.data.message ?? 'Accepted by SAGE',
            integratedAt:      new Date(),
          };
        }
        throw new Error(res.data?.message ?? 'SAGE returned success=false');
      } catch (err: any) {
        lastErr = err;
        this.logger.warn(`[sendToSage] Attempt ${attempt} failed: ${this.extractErrorMessage(err)}`);
        if (attempt < this.config.retryAttempts) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1_000));
        }
      }
    }

    const msg = this.extractErrorMessage(lastErr);
    return {
      success: false, configured: true,
      message: `SAGE integration failed after ${this.config.retryAttempts} attempt(s): ${msg}`,
      errors:  [msg],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — Signature verification (HMAC-SHA256 + Bearer token fallback)
  // ─────────────────────────────────────────────────────────────────────────

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const secret = this.config.webhookSecret;

    if (!secret) {
      this.logger.warn('[webhook] SAGE_WEBHOOK_SECRET not set — skipping verification (dev mode)');
      return true;
    }

    if (!signatureHeader) return false;

    // Mode A: Bearer token
    if (signatureHeader.startsWith('Bearer ')) {
      return signatureHeader.slice(7).trim() === secret;
    }

    // Mode B: HMAC-SHA256
    const receivedHex = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    try {
      const a = Buffer.from(expectedHex, 'hex');
      const b = Buffer.from(receivedHex.padEnd(expectedHex.length, '0'), 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — Map SAGE status strings to internal enum
  // ─────────────────────────────────────────────────────────────────────────

  private mapSageStatus(sageStatus: string): 'SUCCESS' | 'FAILED' | 'PENDING' {
    const s = (sageStatus ?? '').toUpperCase();
    if (['COMPLETED', 'SUCCESS', 'DONE', 'IMPORTED'].includes(s)) return 'SUCCESS';
    if (['FAILED', 'ERROR', 'REJECTED', 'INVALID'].includes(s))   return 'FAILED';
    return 'PENDING';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — Polling lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  private startPolling(): void {
    const ms = this.config.pollIntervalMinutes * 60 * 1_000;
    this.pollingTimer = setInterval(() => {
      this.pollPendingIntegrations().catch(err =>
        this.logger.error(`[poll] Unhandled error: ${err.message}`),
      );
    }, ms);
    this.pollingActive = true;
    this.logger.log(`[poll] Started — every ${this.config.pollIntervalMinutes} min`);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer  = null;
      this.pollingActive = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — DB helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async persistRecord(
    ordreVirementId: string,
    userId:          string | undefined,
    data: {
      status: string; sageTransactionId?: string; errorMessage?: string;
      txtContent?: string; fileName?: string;
    },
  ): Promise<{ id: string }> {
    try {
      let resolvedUserId: string | null = null;
      if (userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        resolvedUserId = u?.id ?? null;
      }
      return await this.prisma.sageIntegration.create({
        data: {
          ordreVirementId,   integratedById:    resolvedUserId,
          status:            data.status,       sageTransactionId: data.sageTransactionId,
          errorMessage:      data.errorMessage, txtContent:        data.txtContent,
          fileName:          data.fileName,
        },
        select: { id: true },
      });
    } catch (err: any) {
      this.logger.error(`[persistRecord] DB write failed: ${err.message}`);
      return { id: 'unknown' };
    }
  }

  private async logWebhook(payload: any, sourceIp?: string): Promise<string> {
    try {
      const log = await this.prisma.sageWebhookLog.create({
        data: {
          rawPayload:        payload ?? {},
          eventType:         payload?.event ?? 'UNKNOWN',
          sageTransactionId: payload?.transactionId  ?? null,
          ordreVirementId:   payload?.ordreVirementId ?? null,
          signatureValid:    false,
          processed:         false,
          sourceIp:          sourceIp ?? null,
        },
        select: { id: true },
      });
      return log.id;
    } catch (err: any) {
      this.logger.error(`[logWebhook] Failed: ${err.message}`);
      return 'unknown';
    }
  }

  private async updateWebhookLog(id: string, data: Partial<{
    signatureValid: boolean; processed: boolean; processingError: string;
    sageTransactionId: string; ordreVirementId: string;
  }>): Promise<void> {
    if (id === 'unknown') return;
    try { await this.prisma.sageWebhookLog.update({ where: { id }, data }); } catch { /* non-fatal */ }
  }

  private extractErrorMessage(err: any): string {
    if (axios.isAxiosError(err)) {
      const e = err as AxiosError<any>;
      if (e.response?.data?.message) return e.response.data.message;
      if (e.code === 'ECONNREFUSED')  return 'SAGE server refused connection';
      if (e.code === 'ETIMEDOUT')     return 'Connection to SAGE timed out';
      return e.message;
    }
    return err?.message ?? 'Unknown error';
  }
}