import * as path from 'path';
import * as fs from 'fs/promises';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'http';

const uploadsDir = path.join(__dirname, '..', 'uploads');

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class AudioGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('send-audio')
  async handleAudioMessage(
    @MessageBody() data: { audio: Buffer; filename: string },
  ): Promise<string> {
    try {
      if (!data || !data.filename) {
        throw new Error('Invalid data received');
      }

      console.log('Uploads directory:', uploadsDir);

      await fs.mkdir(uploadsDir, { recursive: true });

      const filePath = path.join(uploadsDir, data.filename);
      console.log('File path:', filePath);

      await fs.writeFile(filePath, Buffer.from(data.audio));

      console.log('File saved successfully');
      return 'Audio received and saved successfully!';
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw error;
    }
  }
}
