# Hangar Liquor Store - AWS Profile Setup Script
# Run this in PowerShell to configure the correct AWS account for this repo.
#
# Usage:
#   .\scripts\set-aws-profile.ps1
#
# This sets AWS_PROFILE=hanger-personal (your personal account starting with 5).
# The Code Platoon account (starting with 3) is in the 'aico' profile and will not be used.

$ErrorActionPreference = "Stop"

$profileName = "hanger-personal"

Write-Host "Setting AWS_PROFILE to '$profileName' for this PowerShell session..." -ForegroundColor Cyan
$env:AWS_PROFILE = $profileName

# Also set for child processes in this session
[Environment]::SetEnvironmentVariable("AWS_PROFILE", $profileName, "Process")

Write-Host ""
Write-Host "Verifying current AWS identity..." -ForegroundColor Yellow

try {
    $identity = aws sts get-caller-identity --query '{Account:Account, UserId:UserId, Arn:Arn}' --output json 2>&1 | ConvertFrom-Json

    if ($identity.Account -like "57*") {
        Write-Host "✅ SUCCESS: Connected to your PERSONAL AWS account" -ForegroundColor Green
        Write-Host "   Account: $($identity.Account)" -ForegroundColor Green
        Write-Host "   ARN:     $($identity.Arn)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: Connected to account $($identity.Account)" -ForegroundColor Yellow
        Write-Host "   This does not look like your personal account (expected starting with 57...)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ERROR: Could not verify AWS identity." -ForegroundColor Red
    Write-Host "   Make sure the AWS CLI is installed and 'hanger-personal' profile is configured." -ForegroundColor Red
    Write-Host "   Run: aws configure list-profiles" -ForegroundColor White
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "AWS is now configured for this repo using the 'hanger-personal' profile." -ForegroundColor Green
Write-Host ""
Write-Host "Tips:" -ForegroundColor White
Write-Host "  - Run this script at the start of each terminal session for this project." -ForegroundColor White
Write-Host "  - For VS Code / Cursor: select the 'hanger-personal' profile in AWS Toolkit or Amazon Q settings." -ForegroundColor White
Write-Host "  - To verify anytime: aws sts get-caller-identity" -ForegroundColor White
Write-Host ""
Write-Host "The Code Platoon account (aico profile) is isolated and will not be touched." -ForegroundColor DarkGray
