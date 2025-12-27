import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../routes/auth.routes';
import db from '../models';
import { UserRole } from '../models/User';

const app: Express = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Routes', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: UserRole.STUDENT,
  };

  beforeAll(async () => {
    // Ensure database is connected
    await db.sequelize.authenticate();
  });

  afterAll(async () => {
    // Clean up test user if exists
    await db.User.destroy({ where: { email: testUser.email }, force: true });
    await db.sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post('/api/auth/register').send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app).post('/api/auth/register').send({
        ...testUser,
        email: 'test2@example.com',
        role: 'invalid_role',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should fail with short password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        ...testUser,
        email: 'test3@example.com',
        password: '12345',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app).post('/api/auth/register').send(testUser);

      expect(response.status).toBe(409);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: testUser.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      authToken = loginResponse.body.data.token;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });
  });
});

