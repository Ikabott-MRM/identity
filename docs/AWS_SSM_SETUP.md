# AWS SSM Setup Guide for Server Access

## Step 1: Configure AWS Credentials

You need to configure AWS CLI with credentials that have permission to use SSM.

### Option A: Using IAM User Credentials (Recommended for local development)

1. **Get your AWS credentials**:
   - Go to AWS Console → IAM → Users → Your User
   - Click "Security credentials" tab
   - Create an access key if you don't have one
   - Copy the Access Key ID and Secret Access Key

2. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   
   You'll be prompted to enter:
   - **AWS Access Key ID**: `[Your Access Key]`
   - **AWS Secret Access Key**: `[Your Secret Key]`
   - **Default region name**: `us-east-1` (same as your GitHub Actions)
   - **Default output format**: `json`

### Option B: Using AWS SSO (If your org uses SSO)

```bash
aws configure sso
```

Follow the prompts to authenticate via your browser.

---

## Step 2: Verify Configuration

After configuring, run:
```bash
aws sts get-caller-identity
```

You should see output like:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/yourname"
}
```

---

## Step 3: Get Your EC2 Instance ID

From your GitHub repository secrets or AWS Console:

**Method 1: From GitHub**
- Go to your repo → Settings → Secrets and variables → Actions
- Look for `EC2_INSTANCE_ID`

**Method 2: From AWS Console**
- EC2 Dashboard → Instances
- Find your instance (tag or name should match)
- Copy the Instance ID (starts with `i-`)

**Method 3: From CLI** (after AWS is configured):
```bash
aws ec2 describe-instances --filters "Name=tag:Name,Values=*identity*" --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name]" --output table
```

---

## Step 4: Test SSM Connection

Once AWS is configured, test the connection:

```bash
# Interactive session (you can type commands)
aws ssm start-session --target i-YOURINSTANCEID

# Or run a single command
aws ssm send-command \
  --instance-ids i-YOURINSTANCEID \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["whoami","pwd"]' \
  --output text
```

---

## Required IAM Permissions

Your AWS user/role needs these permissions:
- `ssm:StartSession`
- `ssm:SendCommand`
- `ssm:GetCommandInvocation`
- `ec2:DescribeInstances` (optional, for listing instances)

If you get permission errors, ask your AWS admin to attach this policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:StartSession",
                "ssm:SendCommand",
                "ssm:GetCommandInvocation",
                "ssm:DescribeInstanceInformation"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## Once Configured

After setup, I'll be able to run commands like:

```bash
# Run migration
aws ssm send-command \
  --instance-ids i-YOURINSTANCEID \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /home/ubuntu/identity && npx knex migrate:up"]'

# Check service status
aws ssm send-command \
  --instance-ids i-YOURINSTANCEID \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["docker compose -f /home/ubuntu/identity/docker-compose.yml ps"]'
```

---

## Troubleshooting

### "Unable to locate credentials"
Run `aws configure` and enter your credentials.

### "SessionManagerPlugin is not found"
Install the Session Manager plugin:
- **Windows**: Download from https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html
- **Mac**: `brew install --cask session-manager-plugin`

### "TargetNotConnected" error
The EC2 instance needs:
- SSM Agent installed and running
- IAM role with `AmazonSSMManagedInstanceCore` policy
- Network connectivity to SSM endpoints

---

## Next Steps

1. Run `aws configure` and enter your credentials
2. Provide me with your EC2 Instance ID
3. I'll test the connection and run the migration
