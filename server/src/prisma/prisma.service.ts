import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private _syncLog: any;
  private _auditLog: any;
  actionLog: any;
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
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    (this.$on as any)('beforeExit', async () => {
      await app.close();
    });
  }
}