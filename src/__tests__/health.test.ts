import request from 'supertest';
import express, { Express } from 'express';
import healthRoutes from '../routes/health.routes';

const app: Express = express();
app.use(express.json());
app.use('/api', healthRoutes);

describe('Health Route', () => {
  it('GET /api/health should return status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

