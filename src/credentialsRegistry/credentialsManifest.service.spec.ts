import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsManifestService } from './credentialsManifest.service';
import { Knex } from 'knex';
import { Logger } from '@nestjs/common';

describe('credentialsManifestService', () => {
  let service: CredentialsManifestService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  let knex: Knex;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsManifestService,
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
    service = module.get<CredentialsManifestService>(
      CredentialsManifestService,
    );

    await knex.schema.createTable('manifests', table => {
      table.string('cid').primary();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  });

  beforeEach(async () => {
    await knex('manifests').del();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('updateManifest', () => {
    it('should add a new CID to an existing holderDidUri', async () => {
      const manifest = {
        issuerDid: 'did:example:issuer',
        issuedCredentials: [
          { holderDidUri: 'did:example:holder1', cids: ['cid1'] },
        ],
      };
      const credentialCid = 'cid2';
      const holderDidUri = 'did:example:holder1';

      const updatedManifest = await service.updateManifest(
        credentialCid,
        holderDidUri,
        manifest,
      );

      expect(updatedManifest.issuedCredentials[0].cids).toContain('cid2');
    });

    it('should add a new holderDidUri with the given CID if it does not exist', async () => {
      const manifest = {
        issuerDid: 'did:example:issuer',
        issuedCredentials: [],
      };
      const credentialCid = 'cid1';
      const holderDidUri = 'did:example:holder1';

      const updatedManifest = await service.updateManifest(
        credentialCid,
        holderDidUri,
        manifest,
      );

      expect(updatedManifest.issuedCredentials).toHaveLength(1);
      expect(updatedManifest.issuedCredentials[0]).toEqual({
        holderDidUri,
        cids: [credentialCid],
      });
    });
  });

  describe('add manifest', () => {
    it('should insert a CID and DID association into the database', async () => {
      const cid = 'test-cid';

      await service.addManifestToDatabase(cid);
      const savedRegistry = await knex('manifests').where({ cid: cid }).first();
      console.log(savedRegistry);
      expect(savedRegistry).toBeDefined();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `The newly uploaded manifest with CID ${cid} has been successfully saved to the database.`,
      );
    });
  });

  describe('getCurrentManifest', () => {
    it('should return a list of CIDs for a given DIDUri', async () => {
      const cid1 = 'cid1';

      await service.addManifestToDatabase(cid1);

      const cid2 = 'cid2';

      await service.addManifestToDatabase(cid2);
      const results = [{ cid: 'cid1' }];

      const result = await service.getCurrentManifest();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Manifest with CID ${results[0].cid} has been found as the current manifest.`,
      );
      expect(result).toEqual('cid1');
    });

    it('should return null if no manifest is found', async () => {
      const result = await service.getCurrentManifest();
      expect(loggerDebugSpy).toHaveBeenCalledWith(`No manifest was found.`);
      expect(result).toEqual(null);
    });
  });
});
