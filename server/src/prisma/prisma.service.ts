import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  private _syncLog: any;
  private _auditLog: any;

  public get auditLog(): any {
    return this._auditLog;
  }

  public set auditLog(value: any) {
    this._auditLog = value;
  }

  private _passwordResetToken: any;

  public get passwordResetToken(): any {
    return this._passwordResetToken;
  }

  public set passwordResetToken(value: any) {
    this._passwordResetToken = value;
  }

  public get syncLog(): any {
    return this._syncLog;
  }

  public set syncLog(value: any) {
    this._syncLog = value;
  }

  async onModuleInit() {
    (this as any).$on('query', (e: any) => {
      if (e.query && e.query.includes('colonne')) {
        console.log('\n\n🎯🎯🎯 FOUND IT — QUERY WITH colonne:');
        console.log(e.query);
        console.log('PARAMS:', e.params);
        console.log('🎯🎯🎯\n\n');
      }
    });
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    (this.$on as any)('beforeExit', async () => {
      await app.close();
    });
  }
}
