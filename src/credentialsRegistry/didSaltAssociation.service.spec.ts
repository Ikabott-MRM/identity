import { Test, TestingModule } from '@nestjs/testing';
import { DidSaltAssociationService } from './didSaltAssociation.service';
import { Knex } from 'knex';
import { Logger } from '@nestjs/common';

describe('didCidsAssociationService', () => {
  let service: DidSaltAssociationService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  let knex: Knex;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DidSaltAssociationService,
        {
          provide: 'KnexConnection',
          useFactory: () => {
            return require('knex')({
              client: 'sqlite3',
              connection: ':memory:',
              useNullAsDefault: true,
            });
          },
        },
      ],
    }).compile();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');

    knex = module.get<Knex>('KnexConnection');
    service = module.get<DidSaltAssociationService>(DidSaltAssociationService);

    await knex.schema.createTable('did_salt', table => {
      table.string('didUri').primary();
      table.timestamp('salt').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  });

  beforeEach(async () => {
    await knex('did_salt').del();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('addCidToDid', () => {
    it('should insert a salt and DID association into the database', async () => {
      const salt = 'test-salt';
      const didUri = 'did:test:123';

      await service.addDidSaltAssociation(salt, didUri);
      const savedRegistry = await knex('did_salt')
        .where({ didUri: didUri })
        .first();
      console.log(savedRegistry);
      expect(savedRegistry).toBeDefined();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Salt ${salt} has been successfully associated to DIDUri ${didUri} and saved to db.`,
      );
    });
  });

  describe('getDidSalt', () => {
    it('should return the salt for a given DIDUri', async () => {
      const salt1 = 'test-salt1';
      const didUri = 'did:test:123';
      const didUr2 = 'did:test:124';
      const salt2 = 'test-salt2';

      await service.addDidSaltAssociation(salt1, didUri);
      await service.addDidSaltAssociation(salt2, didUr2);

      const results = [{ cid: 'test-salt1' }];

      const result = await service.getDidSalt(didUri);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Salt has been found to be associated with DIDUri ${didUri}`,
      );
      expect(result).toEqual('test-salt1');
    });

    it('should return null array if no salt is found', async () => {
      const didUri = 'did:test:123';

      const result = await service.getDidSalt(didUri);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `No salt was found to be associated with DIDUri ${didUri}`,
      );
      expect(result).toBeNull();
    });
  });
});
