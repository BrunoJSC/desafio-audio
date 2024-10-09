import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioGateway } from './audio/audio.gateway';
import { AudioModule } from './audio/audio.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AudioModule,
  ],
  controllers: [AppController],
  providers: [AppService, AudioGateway],
})
export class AppModule {}
