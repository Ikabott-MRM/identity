import { expect } from 'chai';
import { ethers } from 'hardhat';
import { DidManifestRegistry } from '../typechain-types';

describe('DidManifestRegistry', function () {
  let registry: DidManifestRegistry;
  let owner: any;
  let nonOwner: any;

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();

    const DidManifestRegistryFactory = await ethers.getContractFactory(
      'DidManifestRegistry',
    );
    registry = await DidManifestRegistryFactory.deploy();
    await registry.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the deployer as owner', async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });
  });

  describe('setManifestCid', function () {
    const didKey = ethers.keccak256(ethers.toUtf8Bytes('did:test:123'));
    const manifestCid = 'QmTest123';

    it('Should allow owner to set manifest CID', async function () {
      await expect(registry.connect(owner).setManifestCid(didKey, manifestCid))
        .to.emit(registry, 'ManifestCidSet')
        .withArgs(didKey, manifestCid, owner.address);

      expect(await registry.getManifestCid(didKey)).to.equal(manifestCid);
    });

    it('Should reject empty manifest CID', async function () {
      await expect(
        registry.connect(owner).setManifestCid(didKey, ''),
      ).to.be.revertedWithCustomError(registry, 'InvalidCid');
    });

    it('Should reject non-owner calls', async function () {
      await expect(
        registry.connect(nonOwner).setManifestCid(didKey, manifestCid),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    it('Should allow updating existing manifest CID', async function () {
      await registry.connect(owner).setManifestCid(didKey, manifestCid);
      expect(await registry.getManifestCid(didKey)).to.equal(manifestCid);

      const newCid = 'QmNew456';
      await registry.connect(owner).setManifestCid(didKey, newCid);
      expect(await registry.getManifestCid(didKey)).to.equal(newCid);
    });
  });

  describe('getManifestCid', function () {
    const didKey = ethers.keccak256(ethers.toUtf8Bytes('did:test:456'));

    it('Should return empty string for non-existent DID key', async function () {
      expect(await registry.getManifestCid(didKey)).to.equal('');
    });

    it('Should return correct manifest CID after setting', async function () {
      const manifestCid = 'QmTest789';
      await registry.connect(owner).setManifestCid(didKey, manifestCid);
      expect(await registry.getManifestCid(didKey)).to.equal(manifestCid);
    });

    it('Should be callable by anyone', async function () {
      const manifestCid = 'QmPublic';
      await registry.connect(owner).setManifestCid(didKey, manifestCid);
      expect(await registry.connect(nonOwner).getManifestCid(didKey)).to.equal(
        manifestCid,
      );
    });
  });

  describe('setManifestCidsBatch', function () {
    it('Should allow batch setting of manifest CIDs', async function () {
      const didKey1 = ethers.keccak256(ethers.toUtf8Bytes('did:test:1'));
      const didKey2 = ethers.keccak256(ethers.toUtf8Bytes('did:test:2'));
      const cid1 = 'QmBatch1';
      const cid2 = 'QmBatch2';

      await expect(
        registry
          .connect(owner)
          .setManifestCidsBatch([didKey1, didKey2], [cid1, cid2]),
      )
        .to.emit(registry, 'ManifestCidsBatchSet')
        .withArgs([didKey1, didKey2], [cid1, cid2], owner.address);

      expect(await registry.getManifestCid(didKey1)).to.equal(cid1);
      expect(await registry.getManifestCid(didKey2)).to.equal(cid2);
    });

    it('Should reject mismatched array lengths', async function () {
      const didKey1 = ethers.keccak256(ethers.toUtf8Bytes('did:test:1'));
      await expect(
        registry.connect(owner).setManifestCidsBatch([didKey1], ['Qm1', 'Qm2']),
      ).to.be.revertedWithCustomError(registry, 'ArrayMismatch');
    });

    it('Should reject empty CID in batch', async function () {
      const didKey1 = ethers.keccak256(ethers.toUtf8Bytes('did:test:1'));
      await expect(
        registry.connect(owner).setManifestCidsBatch([didKey1], ['']),
      ).to.be.revertedWithCustomError(registry, 'InvalidCid');
    });
  });

  describe('deleteManifestCid', function () {
    const didKey = ethers.keccak256(ethers.toUtf8Bytes('did:test:delete'));
    const manifestCid = 'QmDeleteMe';

    it('Should allow owner to delete existing manifest', async function () {
      await registry.connect(owner).setManifestCid(didKey, manifestCid);
      expect(await registry.getManifestCid(didKey)).to.equal(manifestCid);

      await expect(registry.connect(owner).deleteManifestCid(didKey))
        .to.emit(registry, 'ManifestCidDeleted')
        .withArgs(didKey, owner.address);

      expect(await registry.getManifestCid(didKey)).to.equal('');
    });

    it('Should reject deletion of non-existent manifest', async function () {
      await expect(
        registry.connect(owner).deleteManifestCid(didKey),
      ).to.be.revertedWithCustomError(registry, 'ManifestNotFound');
    });

    it('Should reject non-owner calls', async function () {
      await registry.connect(owner).setManifestCid(didKey, manifestCid);
      await expect(
        registry.connect(nonOwner).deleteManifestCid(didKey),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });
  });

  describe('deleteManifestCidsBatch', function () {
    it('Should allow batch deletion of manifests', async function () {
      const didKey1 = ethers.keccak256(ethers.toUtf8Bytes('did:test:del1'));
      const didKey2 = ethers.keccak256(ethers.toUtf8Bytes('did:test:del2'));
      await registry
        .connect(owner)
        .setManifestCidsBatch([didKey1, didKey2], ['QmDel1', 'QmDel2']);

      await expect(
        registry.connect(owner).deleteManifestCidsBatch([didKey1, didKey2]),
      )
        .to.emit(registry, 'ManifestCidsBatchDeleted')
        .withArgs([didKey1, didKey2], owner.address);

      expect(await registry.getManifestCid(didKey1)).to.equal('');
      expect(await registry.getManifestCid(didKey2)).to.equal('');
    });

    it('Should reject batch deletion when any manifest does not exist', async function () {
      const didKey1 = ethers.keccak256(ethers.toUtf8Bytes('did:test:del1'));
      const didKey2 = ethers.keccak256(ethers.toUtf8Bytes('did:test:del2'));
      await registry.connect(owner).setManifestCid(didKey1, 'QmDel1');

      await expect(
        registry.connect(owner).deleteManifestCidsBatch([didKey1, didKey2]),
      ).to.be.revertedWithCustomError(registry, 'ManifestNotFound');
    });
  });

  describe('Ownable2Step', function () {
    it('Should transfer ownership only after acceptOwnership', async function () {
      await registry.connect(owner).transferOwnership(nonOwner.address);

      expect(await registry.owner()).to.equal(owner.address);
      expect(await registry.pendingOwner()).to.equal(nonOwner.address);

      await registry.connect(nonOwner).acceptOwnership();

      expect(await registry.owner()).to.equal(nonOwner.address);
    });

    it('Should revert acceptOwnership when called by non-pending owner', async function () {
      const [thirdParty] = await ethers.getSigners();
      await registry.connect(owner).transferOwnership(nonOwner.address);

      await expect(
        registry.connect(thirdParty).acceptOwnership(),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });
  });
});
