import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Static File Serving (e2e)', () => {
  let app: INestApplication;
  const documentsPath = join(__dirname, '..', 'documents');
  const testFileName = 'test-file.txt';
  const testFilePath = join(documentsPath, testFileName);

  beforeAll(async () => {
    if (!existsSync(documentsPath)) {
      mkdirSync(documentsPath, { recursive: true });
    }

    writeFileSync(testFilePath, 'This is a test file');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  it('/documents (GET)', () => {
    return request(app.getHttpServer()).get('/documents').expect(404);
  });

  it('/documents/../app.module.ts (GET)', () => {
    return request(app.getHttpServer())
      .get('/documents/../app.module.ts')
      .expect(404);
  });
});
