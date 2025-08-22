import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

async function bootstrap() {
  const expressApp = express();
  


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