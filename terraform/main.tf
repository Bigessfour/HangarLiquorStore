terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.53.0"  # Latest as of 2026 per MCP query
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.region
  # Use profile or assume role for client's account
  # profile = "hanger-liquor-client"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "store_id" {
  description = "Unique store identifier (e.g. hanger for Hangar Liquor)"
  type        = string
  default     = "hanger"
}

variable "environment" {
  description = "Environment tag (dev/prod)"
  type        = string
  default     = "prod"
}

variable "lambda_memory" {
  description = "Memory for Lambda functions in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 30
}

# DynamoDB Tables - matching current backend
resource "aws_dynamodb_table" "inventory" {
  name         = "HangerInventory"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "upc"

  attribute {
    name = "upc"
    type = "S"
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
  }
}

resource "aws_dynamodb_table" "sales_history" {
  name         = "HangerSalesHistory"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "upc"
  range_key    = "date"

  attribute {
    name = "upc"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
  }
}

resource "aws_dynamodb_table" "local_events" {
  name         = "HangerLocalEvents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "storeId"
  range_key    = "eventId"

  attribute {
    name = "storeId"
    type = "S"
  }

  attribute {
    name = "eventId"
    type = "S"
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
  }
}

# Open Food Facts product catalog (populated from FILTERED database dump for low-cost UPC lookup)
# We ONLY keep liquor/alcohol entries (see scripts/filter-off-liquor-dump.ts) to keep table tiny & cheap.
# Uses on-demand billing (PAY_PER_REQUEST) - pay only for actual low-volume lookups.
# No provisioned capacity, no extra services like Glue/Athena unless you want analytics.
resource "aws_dynamodb_table" "products" {
  name         = "HangerProducts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "upc"

  attribute {
    name = "upc"
    type = "S"
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
    Source      = "OpenFoodFacts-filtered-liquor-only"
  }
}

# S3 bucket for storing OFF database dumps / processed data (filtered to liquor only)
# Use lifecycle policy later if needed to move to cheaper storage classes after load.
resource "aws_s3_bucket" "off_data" {
  bucket = "${var.store_id}-off-data-${var.environment}"

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
    Purpose     = "OpenFoodFactsDumps-liquor-filtered"
  }
}

resource "aws_s3_bucket_versioning" "off_data" {
  bucket = aws_s3_bucket.off_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# IAM Role for Lambdas
data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.store_id}-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy
data "aws_iam_policy_document" "dynamodb_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWriteItem"
    ]
    resources = [
      aws_dynamodb_table.inventory.arn,
      aws_dynamodb_table.sales_history.arn,
      aws_dynamodb_table.local_events.arn,
      aws_dynamodb_table.products.arn
    ]
  }
}

# S3 access for OFF data dumps
data "aws_iam_policy_document" "s3_off_data" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.off_data.arn,
      "${aws_s3_bucket.off_data.arn}/*"
    ]
  }
}

resource "aws_iam_role_policy" "dynamodb" {
  name   = "${var.store_id}-dynamodb-access"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.dynamodb_access.json
}

resource "aws_iam_role_policy" "s3_off" {
  name   = "${var.store_id}-s3-off-data"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.s3_off_data.json
}

# Lambda code packaging
# IMPORTANT: Backend is TypeScript. Build first:
#   cd backend && npm install && npx esbuild lambdas/inventory/inventory-api.ts --bundle --platform=node --target=node20 --outfile=dist/inventory.js
#   (similar for forecast/get-forecast.ts)
# Then update source_dir below to use built JS, e.g. "${path.module}/../backend/dist"
# Current zips source dir (for dev; adjust for prod deploy).
data "archive_file" "inventory_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambdas/inventory"
  output_path = "${path.module}/inventory.zip"
  excludes    = ["node_modules", "tsconfig.json"]
}

data "archive_file" "forecast_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambdas/forecast"
  output_path = "${path.module}/forecast.zip"
  excludes    = ["node_modules", "tsconfig.json"]
}

# Inventory Lambda
resource "aws_lambda_function" "inventory" {
  filename         = data.archive_file.inventory_lambda.output_path
  function_name    = "${var.store_id}-inventory-api"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "inventory-api.handler"
  runtime          = "nodejs20.x"  # Use nodejs24.x or latest supported per AWS/MCP docs
  source_code_hash = data.archive_file.inventory_lambda.output_base64sha256
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  environment {
    variables = {
      STORE_ID               = var.store_id
      INVENTORY_TABLE        = aws_dynamodb_table.inventory.name
      SALES_HISTORY_TABLE    = aws_dynamodb_table.sales_history.name
      LOCAL_EVENTS_TABLE     = aws_dynamodb_table.local_events.name
      PRODUCTS_TABLE         = aws_dynamodb_table.products.name
      SAGEMAKER_ENDPOINT_NAME = var.sagemaker_endpoint
    }
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

# Forecast Lambda
resource "aws_lambda_function" "forecast" {
  filename         = data.archive_file.forecast_lambda.output_path
  function_name    = "${var.store_id}-forecast"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "get-forecast.handler"
  runtime          = "nodejs20.x"  # Use nodejs24.x or latest supported per AWS/MCP docs
  source_code_hash = data.archive_file.forecast_lambda.output_base64sha256
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  environment {
    variables = {
      STORE_ID               = var.store_id
      INVENTORY_TABLE        = aws_dynamodb_table.inventory.name
      SALES_HISTORY_TABLE    = aws_dynamodb_table.sales_history.name
      LOCAL_EVENTS_TABLE     = aws_dynamodb_table.local_events.name
      PRODUCTS_TABLE         = aws_dynamodb_table.products.name
      SAGEMAKER_ENDPOINT_NAME = var.sagemaker_endpoint
    }
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

# API Gateway HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.store_id}-api"
  protocol_type = "HTTP"
  description   = "Hangar Liquor Store API for ${var.store_id}"

  cors_configuration {
    allow_origins = ["*"]  # Restrict in prod
    allow_methods = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

# Integrations
resource "aws_apigatewayv2_integration" "inventory" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.inventory.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "forecast" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.forecast.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# Routes (matching current API)
resource "aws_apigatewayv2_route" "inventory_list" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/inventory"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "inventory_item" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/inventory/{upc}"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "inventory_post" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/inventory"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "inventory_patch" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PATCH /api/inventory/{upc}"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "inventory_scan" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/inventory/scan"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "inventory_import" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/inventory/import"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "inventory_sync" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/inventory/sync"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"
}

resource "aws_apigatewayv2_route" "forecast" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/forecast"
  target    = "integrations/${aws_apigatewayv2_integration.forecast.id}"
}

resource "aws_apigatewayv2_route" "events" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/events"
  target    = "integrations/${aws_apigatewayv2_integration.inventory.id}"  # reuse or separate
}

# Lambda permissions
resource "aws_lambda_permission" "apigw_inventory" {
  statement_id  = "AllowAPIGatewayInvokeInventory"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_forecast" {
  statement_id  = "AllowAPIGatewayInvokeForecast"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.forecast.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

# Outputs
output "api_url" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "inventory_table" {
  value = aws_dynamodb_table.inventory.name
}

output "sales_table" {
  value = aws_dynamodb_table.sales_history.name
}

output "events_table" {
  value = aws_dynamodb_table.local_events.name
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}
