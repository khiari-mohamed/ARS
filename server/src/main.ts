import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as path from 'path';

async function bootstrap() {
  const expressApp = express();
  
  // Increase payload size limit for large file uploads (match nginx 5GB limit)
  expressApp.use(express.json({ limit: '5gb' }));
  expressApp.use(express.urlencoded({ limit: '5gb', extended: true }));
  
  // Serve static files from uploads directory at Express level
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  console.log(`📁 Setting up static files from: ${uploadsPath}`);
  expressApp.use('/uploads', express.static(uploadsPath));
  
  // Add logging middleware for uploads requests
  expressApp.use('/uploads', (req, res, next) => {
    console.log(`📄 Static file request: ${req.url}`);
    next();
  });
  
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.enableCors();
  app.setGlobalPrefix('api');

  const httpServer = createServer(expressApp);

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket.io client connected:', socket.id);
    socket.emit('hello', { message: 'Socket.io is working!' });
    socket.on('disconnect', () => {
      console.log('Socket.io client disconnected:', socket.id);
    });
  });
  
  const port = parseInt(process.env.PORT ?? '5000', 10);
  await app.init();
  
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server (with socket.io) running on port ${port}`);
    console.log(`🔗 Test endpoints:`);
    console.log(`   GET  http://localhost:${port}/api/`);
    console.log(`   POST http://localhost:${port}/api/dashboard`);
    console.log(`   POST http://localhost:${port}/api/feedback`);
  });
}
bootstrap();