<!--
RICH COPY/PASTE VERSION (Google Docs friendly)

How to use:
- Open this file in a Markdown Preview that supports HTML/CSS (Cursor/VS Code preview recommended).
- Copy from the rendered preview (not the raw markdown) into Google Docs.

Notes:
- Mermaid diagrams do not paste well into Google Docs. This doc uses ASCII diagrams instead.
-->

<style>
  .rich-md {
    font-family: "Segoe UI", Inter, Arial, sans-serif;
    color: #0f172a;
    line-height: 1.55;
  }
  .rich-md h1, .rich-md h2, .rich-md h3, .rich-md h4 {
    letter-spacing: -0.01em;
  }
  .rich-md h1 {
    font-size: 26px;
    margin: 0 0 10px 0;
  }
  .rich-md h2 {
    font-size: 18px;
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
  }
  .rich-md h3 { font-size: 15px; margin-top: 14px; }
  .rich-md h4 { font-size: 13px; margin-top: 12px; }

  .rich-md code {
    font-family: Consolas, Menlo, Monaco, monospace;
    font-size: 0.95em;
    background: #f1f5f9;
    padding: 0.15em 0.35em;
    border-radius: 6px;
  }
  .rich-md pre {
    background: #0b1020;
    color: #e6edf3;
    border-radius: 12px;
    padding: 12px 14px;
    overflow: auto;
    border: 1px solid #111827;
  }
  .rich-md pre code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    color: inherit;
    font-size: 12px;
  }

  .rich-md table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 13px;
  }
  .rich-md th, .rich-md td {
    border: 1px solid #e2e8f0;
    padding: 8px 10px;
    vertical-align: top;
  }
  .rich-md th {
    background: #f8fafc;
    text-align: left;
    font-weight: 700;
  }

  .hero {
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
    margin-bottom: 14px;
  }
  .hero-title {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.02em;
    margin-bottom: 6px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 13px;
    color: #334155;
  }
  .meta b { color: #0f172a; }

  .callout {
    margin: 12px 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid #c7d2fe;
    background: #eef2ff;
    color: #1f2937;
  }
  .callout b { color: #111827; }

  .pill {
    display: inline-block;
    font-size: 12px;
    font-weight: 800;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid #86efac;
    background: #dcfce7;
    color: #166534;
    margin-left: 8px;
    vertical-align: middle;
  }
</style>

<div class="rich-md">
  <div class="hero">
    <div class="hero-title">
      DidManifestRegistry — Function Overview (Contract + Tests)
      <span class="pill">AUDIT REFERENCE</span>
    </div>
    <div class="meta">
      <div><b>Contract:</b> <code>identity/contracts/contracts/DidManifestRegistry.sol</code></div>
      <div><b>Tests:</b> <code>identity/contracts/test/DidManifestRegistry.test.ts</code></div>
      <div><b>Solidity:</b> <code>^0.8.20</code></div>
      <div><b>Access control:</b> OpenZeppelin <code>Ownable</code></div>
    </div>
  </div>

  <div class="callout">
    <b>Purpose:</b> public on-chain registry mapping a <code>didKey</code> (<code>bytes32</code>) to an IPFS <code>manifestCid</code> (<code>string</code>). Writes are <b>owner-only</b>; reads are <b>public</b>.
  </div>

  <h2>Data model</h2>

  <h3>Storage</h3>
  <ul>
    <li><b>mapping</b>: <code>manifestCidByDidKey: mapping(bytes32 =&gt; string)</code> (private)</li>
    <li><b>Key</b>: <code>didKey</code> (expected off-chain derivation: <code>keccak256(utf8(didUri))</code>)</li>
    <li><b>Value</b>: <code>manifestCid</code> (non-empty string enforced on writes)</li>
  </ul>

  <h3>Event</h3>
  <ul>
    <li><b>ManifestCidSet</b>: <code>ManifestCidSet(bytes32 indexed didKey, string manifestCid, address indexed writer)</code></li>
    <li><b>Emitted</b>: on every successful single write and for each element in a batch write</li>
  </ul>

  <h2>Typical usage (call flow)</h2>

  <pre><code>Issuer Backend / Ops Wallet (Owner)
        |
        |  setManifestCid(didKey, manifestCid)
        |  setManifestCidsBatch(didKeys[], manifestCids[])
        v
Rootstock / EVM: DidManifestRegistry
        |
        |  getManifestCid(didKey)  (public view)
        v
Wallet / Citizen App / Verifier
        |
        |  GET /ipfs/{manifestCid}
        v
IPFS Gateway  →  Manifest JSON</code></pre>

  <h2>Function summary</h2>

  <table>
    <thead>
      <tr>
        <th>Function</th>
        <th>Visibility</th>
        <th>Modifiers</th>
        <th>State writes</th>
        <th>Emits</th>
        <th>Reverts (directly in this contract)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>constructor()</code></td>
        <td>-</td>
        <td>-</td>
        <td>Yes (owner set via <code>Ownable</code>)</td>
        <td>No</td>
        <td>-</td>
      </tr>
      <tr>
        <td><code>setManifestCid(bytes32 didKey, string manifestCid)</code></td>
        <td>external</td>
        <td><code>onlyOwner</code></td>
        <td>Yes</td>
        <td>Yes</td>
        <td><code>DidManifestRegistry: manifestCid cannot be empty</code></td>
      </tr>
      <tr>
        <td><code>setManifestCidsBatch(bytes32[] didKeys, string[] manifestCids)</code></td>
        <td>external</td>
        <td><code>onlyOwner</code></td>
        <td>Yes</td>
        <td>Yes</td>
        <td>
          <div><code>DidManifestRegistry: arrays length mismatch</code></div>
          <div><code>DidManifestRegistry: manifestCid cannot be empty</code></div>
        </td>
      </tr>
      <tr>
        <td><code>getManifestCid(bytes32 didKey) returns (string)</code></td>
        <td>external view</td>
        <td>-</td>
        <td>No</td>
        <td>No</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>

  <h3>Inherited (OpenZeppelin Ownable)</h3>
  <table>
    <thead>
      <tr>
        <th>Function</th>
        <th>Access</th>
        <th>Operational meaning</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>owner() returns (address)</code></td>
        <td>public view</td>
        <td>Returns the current authorized writer.</td>
      </tr>
      <tr>
        <td><code>transferOwnership(address newOwner)</code></td>
        <td><code>onlyOwner</code></td>
        <td>Rotates write authority to <code>newOwner</code>.</td>
      </tr>
      <tr>
        <td><code>renounceOwnership()</code></td>
        <td><code>onlyOwner</code></td>
        <td>Removes write authority permanently (future writes become impossible).</td>
      </tr>
    </tbody>
  </table>

  <h2>Function-by-function specification</h2>

  <h3><code>constructor()</code></h3>
  <ul>
    <li><b>Behavior</b>: sets initial owner to deployer (<code>msg.sender</code>) via <code>Ownable(msg.sender)</code>.</li>
    <li><b>State changes</b>: writes the owner slot in OpenZeppelin <code>Ownable</code>.</li>
    <li><b>Events</b>: none (in this contract).</li>
  </ul>

  <h3><code>setManifestCid(bytes32 didKey, string manifestCid)</code></h3>
  <ul>
    <li><b>Access</b>: <code>onlyOwner</code></li>
    <li><b>Inputs</b>:
      <ul>
        <li><code>didKey</code>: bytes32 mapping key (expected derived off-chain)</li>
        <li><code>manifestCid</code>: IPFS CID string</li>
      </ul>
    </li>
    <li><b>Reverts (this contract)</b>:
      <ul>
        <li>if <code>manifestCid</code> is empty → <code>DidManifestRegistry: manifestCid cannot be empty</code></li>
      </ul>
    </li>
    <li><b>State changes</b>: <code>manifestCidByDidKey[didKey] = manifestCid</code> (overwrites prior value).</li>
    <li><b>Events</b>: emits <code>ManifestCidSet(didKey, manifestCid, msg.sender)</code>.</li>
  </ul>

  <h3><code>getManifestCid(bytes32 didKey) returns (string)</code></h3>
  <ul>
    <li><b>Access</b>: public read (no modifier)</li>
    <li><b>Inputs</b>: <code>didKey</code></li>
    <li><b>State changes</b>: none</li>
    <li><b>Returns</b>: stored CID; returns empty string (<code>""</code>) if unset.</li>
  </ul>

  <h3><code>setManifestCidsBatch(bytes32[] didKeys, string[] manifestCids)</code></h3>
  <ul>
    <li><b>Access</b>: <code>onlyOwner</code></li>
    <li><b>Inputs</b>:
      <ul>
        <li><code>didKeys</code>: array of bytes32 keys</li>
        <li><code>manifestCids</code>: array of CID strings (index-aligned)</li>
      </ul>
    </li>
    <li><b>Reverts (this contract)</b>:
      <ul>
        <li>if lengths mismatch → <code>DidManifestRegistry: arrays length mismatch</code></li>
        <li>if any CID is empty → <code>DidManifestRegistry: manifestCid cannot be empty</code></li>
      </ul>
    </li>
    <li><b>State changes</b>: for each <code>i</code>, sets <code>manifestCidByDidKey[didKeys[i]] = manifestCids[i]</code> (overwrites prior value).</li>
    <li><b>Events</b>: for each <code>i</code>, emits <code>ManifestCidSet(didKeys[i], manifestCids[i], msg.sender)</code>.</li>
    <li><b>Atomicity</b>: the entire call reverts if any validation fails.</li>
  </ul>

  <h2>State model (per DID key)</h2>
  <pre><code>[UNSET]
  |
  | setManifestCid / setManifestCidsBatch (owner-only, CID non-empty)
  v
[SET]  --(setManifestCid / batch overwrite)-->  [SET]</code></pre>

  <h2>Unit tests (what is asserted)</h2>
  <p><b>File:</b> <code>identity/contracts/test/DidManifestRegistry.test.ts</code></p>

  <table>
    <thead>
      <tr>
        <th>Area</th>
        <th>Assertions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>Deployment</b></td>
        <td>Deployer address equals <code>owner()</code>.</td>
      </tr>
      <tr>
        <td><b>setManifestCid</b></td>
        <td>
          <ul>
            <li>Owner can set CID and event <code>ManifestCidSet(didKey, cid, owner)</code> is emitted.</li>
            <li>Empty CID reverts with <code>DidManifestRegistry: manifestCid cannot be empty</code>.</li>
            <li>Non-owner reverts with OpenZeppelin custom error <code>OwnableUnauthorizedAccount</code>.</li>
            <li>Second write overwrites the existing CID.</li>
          </ul>
        </td>
      </tr>
      <tr>
        <td><b>getManifestCid</b></td>
        <td>
          <ul>
            <li>Returns <code>""</code> for an unset key.</li>
            <li>Returns correct CID after setting.</li>
            <li>Callable by non-owner.</li>
          </ul>
        </td>
      </tr>
      <tr>
        <td><b>setManifestCidsBatch</b></td>
        <td>
          <ul>
            <li>Owner can set two keys in one call; both are retrievable.</li>
            <li>Mismatched array lengths revert with <code>DidManifestRegistry: arrays length mismatch</code>.</li>
            <li>Empty CID in batch reverts with <code>DidManifestRegistry: manifestCid cannot be empty</code>.</li>
          </ul>
        </td>
      </tr>
    </tbody>
  </table>

  <h2>Reference: DID key derivation (as used in tests)</h2>
  <pre><code>const didKey = ethers.keccak256(ethers.toUtf8Bytes("did:test:123"));</code></pre>
  <div class="callout">
    <b>Important:</b> all writers/readers must use the <b>same</b> derivation to guarantee consistent lookups.
  </div>
</div>

