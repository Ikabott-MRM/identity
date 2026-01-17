# Phase 5: Holder-Decryptable Encryption

**Status:** 🔵 Design Phase  
**Priority:** Medium  
**Dependencies:** Phases 1-4 (Complete)  
**Goal:** Enable citizens to decrypt credentials fetched from IPFS without backend interaction

---

## 📋 Overview

### Current State (Phases 1-4)
Citizens can now:
1. ✅ Read `manifestCID` from Rootstock (backendless)
2. ✅ Fetch manifest + credentials from IPFS (backendless)
3. ❌ **Cannot** decrypt credentials client-side (requires backend or pre-shared keys)

### Problem
Current encryption approaches:
- **Issuer-signed credentials:** Citizens need the issuer's public key (available in DID doc, but JWT signature != encryption)
- **Shared secret encryption:** Requires backend to provide decryption key
- **Encrypted with holder's DID private key:** Currently not implemented

This **breaks the backendless flow** because citizens must call the backend to decrypt credentials.

### Desired State (Phase 5)
Citizens can:
1. ✅ Read `manifestCID` from Rootstock (no backend)
2. ✅ Fetch manifest + credentials from IPFS (no backend)
3. 🆕 **Decrypt credentials client-side** with their DID private key (no backend)

**Result:** Fully backendless credential lifecycle (discovery → fetch → decrypt → display)

---

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Credential Issuance                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 1. Issuer issues JWT credential                   │
    │    - Signed with issuer's private key             │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 2. Issuer encrypts credential for holder          │
    │    - Fetch holder's public key from DID doc       │
    │    - Encrypt with holder's public key (ECIES)     │
    │    - Only holder can decrypt                      │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 3. Upload encrypted credential to IPFS            │
    │    - Returns credentialCID                        │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 4. Write manifestCID to Rootstock + MySQL         │
    │    - Manifest includes credentialCID              │
    └───────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                Backendless Credential Discovery                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 1. Citizen derives didKey from DID                │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 2. Read manifestCID from Rootstock                │
    │    - getManifestCid(didKey)                       │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 3. Fetch manifest from IPFS                       │
    │    - Returns list of credentialCIDs               │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 4. Fetch encrypted credentials from IPFS          │
    │    - For each credentialCID                       │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 5. 🆕 Decrypt credentials with holder's DID key   │
    │    - Use holder's private key (ECIES decrypt)     │
    │    - Verify JWT signature with issuer's pub key   │
    └───────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────┐
    │ 6. Display decrypted credentials in app           │
    └───────────────────────────────────────────────────┘
```

---

## 🔐 Cryptographic Design

### Option A: ECIES (Elliptic Curve Integrated Encryption Scheme) ✅ Recommended

**Pros:**
- Standard encryption for EC keys (secp256k1)
- Compatible with DID:DHT (which uses Ed25519, but can derive ECDH keys)
- Well-supported libraries (ethers.js, @noble/secp256k1)
- Hybrid encryption (ECDH + AES)

**Cons:**
- Requires ECDH key exchange (derive shared secret)
- Slightly more complex than sealed-box

**Implementation:**
```typescript
// Backend (Issuer)
import { encrypt } from '@noble/secp256k1';

async function issueEncryptedCredential(
  credentialJWT: string,
  holderPublicKey: string // secp256k1 public key (33 or 65 bytes)
): Promise<string> {
  const encryptedData = await encrypt(
    Buffer.from(credentialJWT, 'utf8'),
    Buffer.from(holderPublicKey, 'hex')
  );
  return encryptedData.toString('base64');
}

// Citizen App
import { decrypt } from '@noble/secp256k1';

async function decryptCredential(
  encryptedData: string,
  holderPrivateKey: string // secp256k1 private key (32 bytes)
): Promise<string> {
  const decryptedBuffer = await decrypt(
    Buffer.from(encryptedData, 'base64'),
    Buffer.from(holderPrivateKey, 'hex')
  );
  return decryptedBuffer.toString('utf8');
}
```

### Option B: NaCl Sealed Box (libsodium)

**Pros:**
- Simpler API (encrypt with public key, decrypt with private key)
- Compatible with Ed25519 (used by DID:DHT)
- Well-tested (NaCl/libsodium)

**Cons:**
- Requires libsodium in React Native (not trivial)
- Larger bundle size

**Implementation:**
```typescript
// Backend (Issuer)
import sodium from 'libsodium-wrappers';

async function issueEncryptedCredential(
  credentialJWT: string,
  holderPublicKey: Uint8Array // Ed25519 public key (32 bytes)
): Promise<string> {
  await sodium.ready;
  const encrypted = sodium.crypto_box_seal(
    Buffer.from(credentialJWT, 'utf8'),
    holderPublicKey
  );
  return Buffer.from(encrypted).toString('base64');
}

// Citizen App
import sodium from 'react-native-libsodium';

async function decryptCredential(
  encryptedData: string,
  holderPublicKey: Uint8Array,
  holderPrivateKey: Uint8Array
): Promise<string> {
  const encrypted = Buffer.from(encryptedData, 'base64');
  const decrypted = sodium.crypto_box_seal_open(
    encrypted,
    holderPublicKey,
    holderPrivateKey
  );
  return Buffer.from(decrypted).toString('utf8');
}
```

### Recommendation: **Option A (ECIES with @noble/secp256k1)**

Reasons:
1. Lighter weight (no libsodium needed)
2. Compatible with Ethereum ecosystem (secp256k1)
3. Easier React Native integration
4. DID:DHT can derive ECDH keys from Ed25519 keys

---

## 📦 Implementation Plan

### 1. Backend Changes (`identity`)

#### 1.1 Add Public Key Retrieval Service

**File:** `identity/src/ssi/didPublicKey.service.ts` (new)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DIDResolutionResult, VerificationMethod } from '@web5/dids';

@Injectable()
export class DidPublicKeyService {
  private readonly logger = new Logger(DidPublicKeyService.name);

  /**
   * Resolve DID and extract secp256k1 public key for encryption
   */
  async getHolderPublicKey(didUri: string): Promise<string | null> {
    try {
      const result: DIDResolutionResult = await resolveDid(didUri);
      
      if (!result.didDocument) {
        this.logger.warn(`DID document not found for ${didUri}`);
        return null;
      }

      // Find keyAgreement key (used for encryption)
      const keyAgreement = result.didDocument.keyAgreement?.[0];
      if (!keyAgreement) {
        this.logger.warn(`No keyAgreement key found for ${didUri}`);
        return null;
      }

      // Extract public key from verification method
      const verificationMethod = 
        typeof keyAgreement === 'string' 
          ? result.didDocument.verificationMethod?.find(vm => vm.id === keyAgreement)
          : keyAgreement;

      if (!verificationMethod?.publicKeyJwk) {
        this.logger.warn(`No publicKeyJwk found for ${didUri}`);
        return null;
      }

      // Convert JWK to secp256k1 public key (hex)
      const publicKeyHex = this.jwkToSecp256k1PublicKey(
        verificationMethod.publicKeyJwk
      );

      this.logger.debug(`Resolved public key for ${didUri}: ${publicKeyHex.substring(0, 20)}...`);
      return publicKeyHex;
    } catch (error) {
      this.logger.error(`Failed to resolve DID ${didUri}:`, error);
      return null;
    }
  }

  private jwkToSecp256k1PublicKey(jwk: any): string {
    // Convert JWK (x, y coordinates) to secp256k1 public key (33 or 65 bytes hex)
    // Implementation depends on JWK format (Ed25519 vs secp256k1)
    // For Ed25519: derive ECDH key
    // For secp256k1: directly use x, y
    
    // Placeholder - implement based on actual JWK format
    return jwk.x; // Simplified
  }
}
```

#### 1.2 Add Encryption Service

**File:** `identity/src/ssi/encryptionService.ts` (update existing or create)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { encrypt } from '@noble/secp256k1';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  /**
   * Encrypt credential JWT with holder's public key (ECIES)
   */
  async encryptForHolder(
    credentialJWT: string,
    holderPublicKeyHex: string
  ): Promise<string> {
    try {
      const publicKeyBuffer = Buffer.from(holderPublicKeyHex, 'hex');
      const encryptedData = await encrypt(
        Buffer.from(credentialJWT, 'utf8'),
        publicKeyBuffer
      );
      
      const encryptedBase64 = Buffer.from(encryptedData).toString('base64');
      this.logger.debug(`Encrypted credential for holder (length: ${encryptedBase64.length})`);
      
      return encryptedBase64;
    } catch (error) {
      this.logger.error('Failed to encrypt credential:', error);
      throw new Error('Credential encryption failed');
    }
  }
}
```

#### 1.3 Update Issuance Flow

**File:** `identity/src/ssi/issuerAgent.service.ts`

```typescript
// Add to imports
import { DidPublicKeyService } from './didPublicKey.service';
import { EncryptionService } from './encryptionService';

@Injectable()
export class IssuerAgentService implements OnModuleInit {
  constructor(
    // ... existing
    private readonly didPublicKeyService: DidPublicKeyService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async issueAndUploadCredential(
    subjectDid: string,
    credentialData: any,
    correlationId?: string
  ): Promise<CredentialResponse> {
    this.logger.info(`Issuing credential for ${subjectDid}`, { correlationId });

    // 1. Issue JWT credential
    const credentialJWT = await this.issueVerifiableCredential(
      subjectDid,
      credentialData
    );

    // 2. 🆕 Encrypt credential with holder's public key
    const holderPublicKey = await this.didPublicKeyService.getHolderPublicKey(subjectDid);
    
    let dataToUpload: string;
    if (holderPublicKey) {
      this.logger.debug(`Encrypting credential with holder's public key`, { correlationId });
      dataToUpload = await this.encryptionService.encryptForHolder(
        credentialJWT,
        holderPublicKey
      );
    } else {
      this.logger.warn(
        `No public key found for ${subjectDid}, uploading unencrypted`,
        { correlationId }
      );
      dataToUpload = credentialJWT; // Fallback: unencrypted
    }

    // 3. Upload to IPFS
    const credentialCID = await this.uploadToIPFS(dataToUpload, correlationId);

    // 4. Update manifest
    const newManifestCID = await this.credentialsManifestService.addToManifest(
      credentialCID,
      subjectDid
    );

    // 5. Write to MySQL
    await this.didCidAssociationService.addManifestToDatabase(
      subjectDid,
      newManifestCID
    );

    // 6. Write to Rootstock
    await this.web3RegistryService.enqueueOrWriteManifestCid(
      subjectDid,
      newManifestCID,
      correlationId
    );

    return {
      credentialJWT,
      credentialCID,
      manifestCID: newManifestCID,
      encrypted: !!holderPublicKey,
    };
  }
}
```

#### 1.4 Add NPM Packages

**File:** `identity/package.json`

```json
{
  "dependencies": {
    "@noble/secp256k1": "^2.0.0"
  }
}
```

---

### 2. Citizen App Changes (`IDA-Ciudadano-App`)

#### 2.1 Add Decryption Service

**File:** `IDA-Ciudadano-App/services/encryptionService.ts` (new)

```typescript
import { decrypt } from '@noble/secp256k1';

/**
 * Decrypt credential encrypted with holder's public key
 */
export async function decryptCredential(
  encryptedDataBase64: string,
  holderPrivateKeyHex: string
): Promise<string> {
  try {
    const encryptedBuffer = Buffer.from(encryptedDataBase64, 'base64');
    const privateKeyBuffer = Buffer.from(holderPrivateKeyHex, 'hex');

    const decryptedBuffer = await decrypt(encryptedBuffer, privateKeyBuffer);
    
    return decryptedBuffer.toString('utf8');
  } catch (error) {
    console.error('[EncryptionService] Failed to decrypt credential:', error);
    throw new Error('Credential decryption failed');
  }
}

/**
 * Check if data is encrypted (base64 ECIES format)
 */
export function isEncrypted(data: string): boolean {
  // Simple heuristic: JWT starts with "eyJ", encrypted data is longer base64
  return !data.startsWith('eyJ') && /^[A-Za-z0-9+/=]+$/.test(data);
}
```

#### 2.2 Update Credential Chain Service

**File:** `IDA-Ciudadano-App/services/credentialChain.ts`

```typescript
import { decryptCredential, isEncrypted } from './encryptionService';
import { getPrivateKeyFromDid } from './did'; // Existing function

export async function fetchAndDecryptCredential(
  credentialCID: string,
  holderDid: string
): Promise<string> {
  console.log(`[CredentialChain] Fetching credential ${credentialCID}`);
  
  // 1. Fetch from IPFS
  const encryptedData = await fetchFromIPFS(credentialCID);
  
  // 2. Check if encrypted
  if (!isEncrypted(encryptedData)) {
    console.log(`[CredentialChain] Credential is not encrypted, returning as-is`);
    return encryptedData; // Already a JWT
  }

  // 3. Decrypt with holder's private key
  console.log(`[CredentialChain] Decrypting credential...`);
  const holderPrivateKey = await getPrivateKeyFromDid(holderDid);
  
  const credentialJWT = await decryptCredential(encryptedData, holderPrivateKey);
  
  console.log(`[CredentialChain] Credential decrypted successfully`);
  return credentialJWT;
}
```

#### 2.3 Add NPM Packages

**File:** `IDA-Ciudadano-App/package.json`

```json
{
  "dependencies": {
    "@noble/secp256k1": "^2.0.0"
  }
}
```

---

## 🧪 Testing Plan

### Unit Tests

#### Backend Tests
1. **`DidPublicKeyService.getHolderPublicKey()`**
   - ✅ Returns public key for valid DID
   - ✅ Returns null for invalid DID
   - ✅ Returns null for DID without keyAgreement

2. **`EncryptionService.encryptForHolder()`**
   - ✅ Encrypts credential successfully
   - ✅ Throws error for invalid public key

3. **`IssuerAgentService.issueAndUploadCredential()`**
   - ✅ Encrypts credential when holder has public key
   - ✅ Falls back to unencrypted when no public key
   - ✅ Uploads encrypted credential to IPFS

#### Citizen App Tests
1. **`decryptCredential()`**
   - ✅ Decrypts encrypted credential
   - ✅ Throws error for invalid encrypted data
   - ✅ Throws error for wrong private key

2. **`isEncrypted()`**
   - ✅ Returns true for encrypted data
   - ✅ Returns false for JWT

### Integration Tests

1. **End-to-End Backendless Flow**
   ```typescript
   test('Issue encrypted credential and decrypt client-side', async () => {
     // 1. Create holder DID with secp256k1 key
     const holderDid = await createDid();
     
     // 2. Issue encrypted credential
     const { credentialCID, manifestCID } = await issuerAgent.issueCredential(
       holderDid.uri,
       { name: 'Test User' }
     );
     
     // 3. Read manifestCID from Rootstock (citizen app)
     const onChainManifestCID = await web3Registry.getManifestCid(holderDid.uri);
     expect(onChainManifestCID).toBe(manifestCID);
     
     // 4. Fetch manifest from IPFS
     const manifest = await fetchFromIPFS(manifestCID);
     
     // 5. Fetch encrypted credential from IPFS
     const encryptedData = await fetchFromIPFS(manifest.credentials[0]);
     
     // 6. Decrypt with holder's private key
     const credentialJWT = await decryptCredential(
       encryptedData,
       holderDid.privateKey
     );
     
     // 7. Verify JWT signature
     const verified = await verifyJWT(credentialJWT);
     expect(verified).toBe(true);
     expect(verified.payload.name).toBe('Test User');
   });
   ```

---

## 📊 Migration Strategy

### Backward Compatibility

**Problem:** Existing credentials are **not encrypted** with holder's public key.

**Solution:** Support both encrypted and unencrypted credentials:

1. **Backend:** 
   - Check if holder has public key
   - If yes: encrypt (new behavior)
   - If no: upload unencrypted (old behavior)

2. **Citizen App:**
   - Check if credential is encrypted (`isEncrypted()`)
   - If yes: decrypt client-side
   - If no: use as-is (JWT)

**Result:** Gradual migration - new credentials encrypted, old credentials still work

---

## 🚀 Rollout Plan

### Phase 5.1: Backend Implementation
1. Install `@noble/secp256k1`
2. Implement `DidPublicKeyService`
3. Implement `EncryptionService`
4. Update `IssuerAgentService` to encrypt credentials
5. Add unit tests
6. Deploy to development

### Phase 5.2: Citizen App Implementation
1. Install `@noble/secp256k1`
2. Implement `encryptionService.ts`
3. Update `credentialChain.ts` to decrypt
4. Add unit tests
5. Test with development environment

### Phase 5.3: Integration Testing
1. Issue test credential (encrypted)
2. Verify encryption on IPFS
3. Verify citizen app can decrypt
4. Test fallback for unencrypted credentials

### Phase 5.4: Production Rollout
1. Deploy backend changes
2. Deploy citizen app changes
3. Monitor logs for decryption errors
4. Gradually migrate old credentials (re-issue)

---

## 🔒 Security Considerations

### Key Management
- **Holder Private Key:** Stored securely in citizen app (Expo SecureStore / iOS Keychain / Android Keystore)
- **Issuer Private Key:** Stored in backend `.env` (server-side only)
- **Public Keys:** Stored in DID documents (public, on-chain)

### Attack Vectors
1. **MITM Attack on IPFS:**
   - ✅ Mitigated: Credentials are encrypted + JWT signed
   - Attacker can't decrypt without holder's private key
   - Attacker can't forge credentials without issuer's private key

2. **Compromised IPFS Gateway:**
   - ✅ Mitigated: Same as MITM
   - Gateway can't read encrypted credentials

3. **Holder Private Key Theft:**
   - ⚠️ Risk: Attacker can decrypt all credentials
   - Mitigation: Secure key storage (biometric auth, etc.)

4. **Issuer Private Key Theft:**
   - ⚠️ Risk: Attacker can issue fake credentials
   - Mitigation: HSM, key rotation, monitoring

### Best Practices
- ✅ Use ECIES (authenticated encryption)
- ✅ Always verify JWT signature after decryption
- ✅ Store private keys in secure enclaves
- ✅ Use short-lived credentials (set expiration)
- ✅ Monitor for unusual decryption patterns

---

## 📈 Performance Impact

### Backend
- **Encryption overhead:** ~1-5ms per credential (negligible)
- **DID resolution:** ~50-200ms (cache DID docs)
- **IPFS upload:** No change (already encrypted or not)

### Citizen App
- **Decryption overhead:** ~1-5ms per credential (negligible)
- **Overall UX:** Faster (no backend call for decryption)

### Network
- **Rootstock reads:** Same (1 call per DID)
- **IPFS fetches:** Same (1 manifest + N credentials)
- **Backend calls:** ❌ **Eliminated** (decryption now client-side)

**Result:** Faster, more private, more resilient

---

## ✅ Acceptance Criteria

Phase 5 is **complete** when:
- [ ] Backend encrypts new credentials with holder's public key
- [ ] Backend supports both encrypted and unencrypted credentials
- [ ] Citizen app can decrypt credentials client-side
- [ ] Citizen app falls back to unencrypted credentials gracefully
- [ ] Unit tests pass (backend + app)
- [ ] Integration test passes (E2E backendless flow)
- [ ] Deployed to production
- [ ] Monitored for 7 days without errors

---

## 📚 References

- **ECIES:** [Elliptic Curve Integrated Encryption Scheme](https://en.wikipedia.org/wiki/Integrated_Encryption_Scheme)
- **@noble/secp256k1:** [GitHub](https://github.com/paulmillr/noble-secp256k1)
- **DID:DHT Spec:** [did:dht Method Specification](https://did-dht.com/)
- **W3C DID Core:** [DID Core Specification](https://www.w3.org/TR/did-core/)
- **Web5 Crypto:** [Web5 Crypto](https://github.com/TBD54566975/web5-js/tree/main/packages/crypto)

---

**Next Steps:**
1. Review this design with the team
2. Prototype ECIES encryption/decryption
3. Test key derivation from DID:DHT
4. Implement Phase 5.1 (backend)

**Status:** 🔵 Design Complete, Ready for Implementation
