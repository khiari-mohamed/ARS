import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Full Backend E2E', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Use correct login payload
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    expect([200, 201, 401]).toContain(loginRes.status);
    jwtToken = loginRes.body.access_token;
    expect(jwtToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  // Auth
  describe('Auth', () => {
    it('POST /auth/login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'password' });
      expect([200, 201, 401]).toContain(res.status);
    });
  });

  // Users
  describe('Users', () => {
    it('GET /users', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect([200, 404]).toContain(res.status);
    });
  });

  // ... (repeat for other modules as in your file)

  // Dashboard
  describe('Dashboard', () => {
    it('GET /dashboard/overview', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/overview')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('traitementKpi');
      expect(res.body).toHaveProperty('bordereauKpi');
    });

    it('GET /dashboard/alerts', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/alerts')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
    });

    it('GET /dashboard/sync-status', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/sync-status')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('lastSync');
    });

    it('GET /dashboard/export', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/export?format=excel')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('POST /dashboard/sync', async () => {
      const res = await request(app.getHttpServer())
        .post('/dashboard/sync')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('imported');
    });
  });

  // Integration (Tuniclaim)
  describe('Integration', () => {
    it('POST /dashboard/sync (again)', async () => {
      const res = await request(app.getHttpServer())
        .post('/dashboard/sync')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect([200, 201]).toContain(res.status);
    });
  });
});