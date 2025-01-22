import { Test, TestingModule } from '@nestjs/testing';
import { DidCidAssociationService } from './didCidAssociation.service';
import { Knex } from 'knex';
import { Logger } from '@nestjs/common';

describe('didCidsAssociationService', () => {
  let service: DidCidAssociationService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  let knex: Knex;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DidCidAssociationService,
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
    service = module.get<DidCidAssociationService>(DidCidAssociationService);

    await knex.schema.createTable('did_cids', table => {
      table.string('cid').primary();
      table.string('didUri').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('didUri', 'idx_didUri');
    });
  });

  beforeEach(async () => {
    await knex('did_cids').del();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('addCidToDid', () => {
    it('should insert a CID and DID association into the database', async () => {
      const cid = 'test-cid';
      const didUri = 'did:test:123';

      await service.addCidToDid(cid, didUri);
      const savedRegistry = await knex('did_cids').where({ cid: cid }).first();
      console.log(savedRegistry);
      expect(savedRegistry).toBeDefined();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `CID ${cid} has been successfully associated to DIDUri ${didUri} and saved to db.`,
      );
    });
  });

  describe('getCidsByDid', () => {
    it('should return a list of CIDs for a given DIDUri', async () => {
      const cid1 = 'cid1';
      const didUri = 'did:test:123';

      await service.addCidToDid(cid1, didUri);

      const cid2 = 'cid2';

      await service.addCidToDid(cid2, didUri);
      const results = [{ cid: 'cid1' }, { cid: 'cid2' }];

      const result = await service.getCidsByDid(didUri);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `${results.length} CIDs have been found to be associated with DIDUri ${didUri}`,
      );
      expect(result).toEqual(['cid1', 'cid2']);
    });

    it('should return an empty array if no CIDs are found', async () => {
      const didUri = 'did:test:123';

      const result = await service.getCidsByDid(didUri);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `No CIDs were found to be associated with DIDUri ${didUri}`,
      );
      expect(result).toEqual([]);
    });
  });
});
