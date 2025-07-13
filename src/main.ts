import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerOptions } from './loggers/constants';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const instance = WinstonModule.createLogger(winstonLoggerOptions);

  const app = await NestFactory.create(AppModule, {
    logger: instance,
  });

  const configService = app.get<ConfigService>(ConfigService);
  app.enableCors({
    origin: configService.get('corsConfig.origin'),
    methods: configService.get('corsConfig.methods'),
    preflightContinue: configService.get('corsConfig.preflightContinue'),
    optionsSuccessStatus: configService.get('corsConfig.optionsSuccessStatus'),
    maxAge: configService.get('corsConfig.maxAge'),
  });

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Identity API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
