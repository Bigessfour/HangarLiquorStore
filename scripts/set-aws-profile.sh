#!/bin/bash
# Hangar Liquor Store - AWS Profile Setup (macOS / Linux)
# Usage: source scripts/set-aws-profile.sh   or   ./scripts/set-aws-profile.sh

set -e

PROFILE="hanger-personal"
export AWS_PROFILE="$PROFILE"

echo "AWS_PROFILE set to '$PROFILE'"

if command -v aws &> /dev/null; then
  aws sts get-caller-identity || echo "AWS CLI not configured or profile invalid. Run 'aws configure --profile $PROFILE'"
else
  echo "AWS CLI not found. Install it first."
fi

echo ""
echo "Tip: On macOS/Linux, run 'source scripts/set-aws-profile.sh' to set for current shell."
echo "For persistent use, add 'export AWS_PROFILE=hanger-personal' to your ~/.zshrc or ~/.bash_profile"