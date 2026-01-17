# GitHub Actions → AWS OIDC → SSM Deploy (sbweb3* tags)

## Goal
Deploy updates to the `identity-web3-node` EC2 instance automatically when a **git tag** starting with **`sbweb3`** is pushed.

Trigger example:
- `sbweb3-test-13`

## High-level architecture
- **GitHub Actions** runs on tag push.
- GitHub Actions authenticates to AWS using **OIDC** (no long-lived AWS keys).
- GitHub Actions calls **SSM Run Command** (`AWS-RunShellScript`) against the EC2 instance.
- The instance runs a small deploy script:
  - `git fetch` tags
  - `git checkout` the tag
  - `docker compose up -d --build --no-deps api`

## AWS prerequisites
### 1) EC2 instance is an SSM Managed Node
Attach an **EC2 instance role** (instance profile) with:
- `AmazonSSMManagedInstanceCore`

Confirm in AWS Console:
- Systems Manager → Fleet Manager → Managed nodes
  - Node shows **Online**

### 2) GitHub OIDC identity provider
IAM → Identity providers:
- OpenID Connect provider: `token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 3) GitHub deploy role (assumed by Actions)
IAM role used by GitHub Actions:
- Trusts `token.actions.githubusercontent.com`
- Restricts `sub` to only this repo and only tag refs `refs/tags/sbweb3*`
- Has permissions to:
  - `ssm:SendCommand`
  - `ssm:GetCommandInvocation` (+ list APIs for convenience)

Notes:
- `AWS-RunShellScript` is an AWS-managed document; the document ARN may appear without an account id.

## GitHub configuration
### Repository secrets
GitHub repo → Settings → Secrets and variables → Actions → **Secrets**:
- `AWS_DEPLOY_ROLE_ARN` (IAM role ARN for GitHub OIDC deploy role)
- `EC2_INSTANCE_ID` (e.g. `i-078b4aa20a1efac2a`)

### Workflow file
The workflow lives at:
- `identity/.github/workflows/deploy-sbweb3.yml`

Behavior:
- On `push` to tags matching `sbweb3*`, assume the AWS role and execute `aws ssm send-command`.
- Uses JSON `--parameters` (built via `jq`) to avoid quoting issues.
- Runs deployment commands as the `ubuntu` user to avoid Git “dubious ownership” problems.

## Key issues encountered (and fixes)
### A) IAM AccessDenied for `ssm:SendCommand`
Cause:
- Policy resource ARN didn’t match the actual SSM document ARN used by the API call.
Fix:
- Update the deploy role policy to allow `ssm:SendCommand` for the correct `AWS-RunShellScript` document ARN and the target instance.

### B) Missing instance id in workflow
Symptom:
- ValidationException: `Value '[]' at 'instanceIds' ...`
Fix:
- Add `EC2_INSTANCE_ID` as a **Repository secret** with the instance id value.

### C) Git “dubious ownership” / `$HOME not set`
Cause:
- SSM runs as a different user (often `root`), and Git refuses to operate in a repo owned by `ubuntu`.
Fix:
- Run deploy commands as ubuntu:
  - `sudo -u ubuntu -H bash -lc '...'`

### D) Private repo fetch failed (no GitHub credentials)
Symptom:
- `fatal: could not read Username for 'https://github.com'`
Fix options:
- Add an SSH deploy key to the instance, **or**
- Make the repo public (chosen for simplicity in this session).

### E) SSM IPC timeout failures
Cause discovered:
- Root filesystem was 100% full; SSM couldn’t write to `/var/lib/amazon/ssm/...` → `no space left on device` → IPC timeout.
Fix:
- Increase EBS volume size (e.g. 32G → 100G)
- Expand the partition + filesystem on the instance:
  - `sudo env TMPDIR=/run growpart /dev/nvme0n1 1`
  - `sudo resize2fs /dev/nvme0n1p1`

### F) Node “Connection lost” / DeliveryTimedOut
Cause:
- Instance was unreachable by SSM (agent/network/instance health).
Fix:
- Restore instance health (reboot/stop-start as needed)
- Confirm SSM agent + role + outbound connectivity

### G) Instance sizing
The instance was upgraded from `t3.micro` to `t3.medium` to provide more headroom for docker builds and stability.

## Operating procedure (day-to-day)
1. Commit changes to the repo.
2. Create and push a tag that starts with `sbweb3`:
   - `git tag sbweb3-<something>`
   - `git push origin sbweb3-<something>`
3. Watch GitHub Actions job logs.
4. Validate SSM command status in:
   - Systems Manager → Run Command



