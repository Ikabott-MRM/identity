# PowerShell helper: remind ops to scrub before AMI (Windows workstation docs).
# The scrub itself runs ON the Linux EC2 via prepare-golden-ami.sh.

param(
    [Parameter(Mandatory = $true)][string]$InstanceId,
    [string]$Region = "us-east-1",
    [string]$RemotePath = "/home/ubuntu/identity"
)

$ErrorActionPreference = "Stop"

Write-Host "Sending prepare-golden-ami.sh via SSM to $InstanceId ..." -ForegroundColor Cyan

$commands = @(
    "cd $RemotePath",
    "git pull || true",
    "bash scripts/prepare-golden-ami.sh"
)

$cmdId = aws ssm send-command `
    --region $Region `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=$($commands | ConvertTo-Json -Compress)" `
    --query "Command.CommandId" --output text

Write-Host "CommandId: $cmdId"
Write-Host "Wait for success, then: aws ec2 create-image --instance-id $InstanceId --name ssi-identity-golden-YYYYMMDD --no-reboot"
Write-Host "See docs/GOLDEN_AMI_IDENTITY.md"
