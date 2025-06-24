import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createServer } from 'http';
import { Server } from 'socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  // Create HTTP server and attach socket.io
  const httpServer = createServer(app.getHttpAdapter().getInstance());

  const io = new Server(httpServer, {
    cors: {
      origin: '*', // You can restrict this to your frontend domain in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket.io client connected:', socket.id);

    // Example: emit a test event
    socket.emit('hello', { message: 'Socket.io is working!' });

    socket.on('disconnect', () => {
      console.log('Socket.io client disconnected:', socket.id);
    });
  });

  const port = process.env.PORT ?? 8000;
  httpServer.listen(port, () => {
    console.log(`Server (with socket.io) running on port ${port}`);
  });
}
bootstrap();