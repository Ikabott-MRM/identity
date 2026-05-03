# Capture launch parameters from the dev identity-web3-node instance.
# Run this in PowerShell with an AWS profile/user that has ec2:DescribeInstances.
# Usage: .\scripts\capture-ec2-launch-params.ps1 [-Region us-east-1] [-InstanceId i-078b4aa20a1efac2a]

param(
    [string]$Region = "us-east-1",
    [string]$InstanceId = "i-078b4aa20a1efac2a"
)

$ErrorActionPreference = "Stop"

$inst = aws ec2 describe-instances --region $Region --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0]" --output json | ConvertFrom-Json

if (-not $inst) { throw "Instance $InstanceId not found in $Region" }

$keyPair = $inst.KeyName
$subnetId = $inst.SubnetId
$vpcId = $inst.VpcId
$sgIds = ($inst.SecurityGroups | ForEach-Object { $_.GroupId }) -join " "
$iamProfileName = $inst.IamInstanceProfile.Arn.Split("/")[-1]
$az = $inst.Placement.AvailabilityZone
$rootVol = $inst.BlockDeviceMappings | Where-Object { $_.DeviceName -eq $inst.RootDeviceName }

Write-Host "`n=== identity-web3-node launch params ===" -ForegroundColor Green
Write-Host "`$keyPair      = `"$keyPair`""
Write-Host "`$subnetId    = `"$subnetId`""
Write-Host "`$vpcId       = `"$vpcId`""
Write-Host "`$sgIds       = `"$sgIds`""
Write-Host "`$iamProfile  = `"$iamProfileName`""
Write-Host "`$az          = `"$az`""
if ($rootVol.Ebs) {
    Write-Host "Root volume: $($rootVol.DeviceName) VolumeId=$($rootVol.Ebs.VolumeId)"
}

$sgArray = ($inst.SecurityGroups | ForEach-Object { "`"$($_.GroupId)`"" }) -join ","
Write-Host "`n--- Copy-paste for duplicate-identity-web3-node-prod.ps1 ---" -ForegroundColor Cyan
Write-Host "`$keyPair = `"$keyPair`""
Write-Host "`$subnetId = `"$subnetId`""
Write-Host "`$sgIds = @($sgArray)"
