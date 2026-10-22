import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import conversationRoutes from './routes/conversation.routes';
import { setupSocketServer } from './sockets/chat.socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export const io = new SocketIOServer(server, {
  cors: {
    origin: clientUrl,
    credentials: true,
  },
});

setupSocketServer(io);

server.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

export { app, server };
