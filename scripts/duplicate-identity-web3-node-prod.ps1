# Clone identity-web3-node (dev) to identity-web3-node-prod via AMI + launch.
# Prerequisites: AWS CLI, ec2:CreateImage ec2:RunInstances ec2:Describe* on the account.
#
# 1) Run .\scripts\capture-ec2-launch-params.ps1 and paste the variables below (or pass as parameters).

param(
    [string]$Region = "us-east-1",
    [string]$SourceInstanceId = "i-078b4aa20a1efac2a",
    [string]$KeyPair = "",
    [string]$SubnetId = "",
    [string[]]$SecurityGroupIds = @(),
    [string]$IamInstanceProfileName = "",
    [string]$InstanceType = "t3.medium"
)

$ErrorActionPreference = "Stop"

if (-not $KeyPair -or -not $SubnetId -or $SecurityGroupIds.Count -eq 0 -or -not $IamInstanceProfileName) {
    Write-Host "Set KeyPair, SubnetId, SecurityGroupIds, and IamInstanceProfileName (from capture-ec2-launch-params.ps1)." -ForegroundColor Yellow
    exit 1
}

$date = Get-Date -Format "yyyyMMdd"
Write-Host "Creating AMI from $SourceInstanceId (no reboot on source)..." -ForegroundColor Green

$amiId = aws ec2 create-image `
    --region $Region `
    --instance-id $SourceInstanceId `
    --name "identity-web3-node-prod-$date" `
    --description "Source AMI for identity-web3-node-prod (mainnet)" `
    --no-reboot `
    --query 'ImageId' --output text

Write-Host "AMI: $amiId - waiting until available..." -ForegroundColor Cyan
do {
    $state = aws ec2 describe-images --region $Region --image-ids $amiId --query 'Images[0].State' --output text
    Write-Host "AMI state: $state"
    if ($state -ne "available") { Start-Sleep -Seconds 30 }
} while ($state -ne "available")

$sgJoined = $SecurityGroupIds -join " "

Write-Host "Launching prod instance..." -ForegroundColor Green
$prodInstanceId = aws ec2 run-instances `
    --region $Region `
    --image-id $amiId `
    --instance-type $InstanceType `
    --key-name $KeyPair `
    --security-group-ids $sgJoined `
    --subnet-id $SubnetId `
    --iam-instance-profile "Name=$IamInstanceProfileName" `
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=identity-web3-node-prod},{Key=Environment,Value=prod}]' `
    --query 'Instances[0].InstanceId' --output text

aws ec2 wait instance-running --region $Region --instance-ids $prodInstanceId
$prodIp = aws ec2 describe-instances --region $Region --instance-ids $prodInstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Prod InstanceId: $prodInstanceId"
Write-Host "Public IP:       $prodIp"
Write-Host "AMI:             $amiId"
Write-Host "`nNext: set GitHub secret EC2_INSTANCE_ID_PROD to $prodInstanceId"
Write-Host 'Then follow docs/identity/identity-web3-node-prod-post-ami.md to flip WEB3_* to mainnet.'
