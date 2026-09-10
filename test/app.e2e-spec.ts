import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DocumentsController } from '../src/documents/documents.controller';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Documents are API-key protected via APP_GUARD in AppModule.
 * This suite tests the controller path-safety and file serving in isolation.
 */
describe('DocumentsController (e2e-ish)', () => {
  let app: INestApplication;
  const documentsPath = join(process.cwd(), 'documents');
  const testFileName = 'test-file.txt';
  const testFilePath = join(documentsPath, testFileName);

  beforeAll(async () => {
    if (!existsSync(documentsPath)) {
      mkdirSync(documentsPath, { recursive: true });
    }

    writeFileSync(testFilePath, 'This is a test file');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
    await app.close();
  });

  it('/documents/test-file.txt (GET)', () => {
    return request(app.getHttpServer())
      .get(`/documents/${testFileName}`)
      .expect(200)
      .expect('This is a test file');
  });

  it('/documents/non-existent-file.txt (GET)', () => {
    return request(app.getHttpServer())
      .get('/documents/non-existent-file.txt')
      .expect(404);
  });

  it('/documents/../package.json (GET) rejects traversal', () => {
    return request(app.getHttpServer())
      .get('/documents/../package.json')
      .expect(400);
  });
});
