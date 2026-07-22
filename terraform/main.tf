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
resource "aws_dynamodb_table" "square_connection" {
  name         = "HangerSquareConnection"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "storeId"

  attribute {
    name = "storeId"
    type = "S"
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
    Purpose     = "Square POS OAuth metadata - Owner only"
  }
}

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
      aws_dynamodb_table.products.arn,
      aws_dynamodb_table.square_connection.arn
    ]
  }
}

# Square OAuth tokens + application credentials (Owner-managed connection)
data "aws_iam_policy_document" "ssm_square" {
  statement {
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:PutParameter"
    ]
    resources = [
      "arn:aws:ssm:${var.region}:*:parameter/${var.store_id}/${var.environment}/square/*"
    ]
  }
}

# Permissions for in-app user management via Cognito (Owner/Manager can create users, assign roles)
data "aws_iam_policy_document" "cognito_admin" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminRemoveUserFromGroup",
      "cognito-idp:AdminSetUserPassword",
      "cognito-idp:AdminDisableUser",
      "cognito-idp:AdminEnableUser",
      "cognito-idp:ListUsers",
      "cognito-idp:ListUsersInGroup",
      "cognito-idp:AdminGetUser"
    ]
    resources = [aws_cognito_user_pool.main.arn]
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

resource "aws_iam_role_policy" "cognito_admin" {
  name   = "${var.store_id}-cognito-admin"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.cognito_admin.json
}

resource "aws_iam_role_policy" "s3_off" {
  name   = "${var.store_id}-s3-off-data"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.s3_off_data.json
}

resource "aws_iam_role_policy" "ssm_square" {
  name   = "${var.store_id}-ssm-square"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.ssm_square.json
}

# SageMaker Canvas inference (for high-accuracy model)
data "aws_iam_policy_document" "sagemaker_invoke" {
  count = var.sagemaker_endpoint != "" ? 1 : 0
  statement {
    actions   = ["sagemaker:InvokeEndpoint"]
    resources = ["*"] # Scope to specific endpoint ARN in production if desired
  }
}

resource "aws_iam_role_policy" "sagemaker" {
  count  = var.sagemaker_endpoint != "" ? 1 : 0
  name   = "${var.store_id}-sagemaker-invoke"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.sagemaker_invoke[0].json
}

# AWS Budgets for cost control (recommended for low-cost client deployment)
resource "aws_budgets_budget" "monthly_cost" {
  name              = "${var.store_id}-monthly-cost-budget"
  budget_type       = "COST"
  limit_amount      = "50"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["alerts@example.com"] # Update with real email
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Purpose     = "Cost monitoring for serverless inventory app"
  }
}

# Lambda code packaging
# IMPORTANT: Backend is TypeScript. Build first:
#   cd backend && npm install && npx esbuild lambdas/inventory/inventory-api.ts --bundle --platform=node --target=node20 --outfile=dist/inventory.js
#   (similar for forecast/get-forecast.ts)
# Then update source_dir below to use built JS, e.g. "${path.module}/../backend/dist"
# Current zips source dir (for dev; adjust for prod deploy).
data "archive_file" "inventory_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda-dist/inventory"
  output_path = "${path.module}/inventory.zip"
  excludes    = ["node_modules", "tsconfig.json"]
}

data "archive_file" "forecast_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda-dist/forecast"
  output_path = "${path.module}/forecast.zip"
  excludes    = ["node_modules", "tsconfig.json"]
}

data "archive_file" "events_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda-dist/events"
  output_path = "${path.module}/events.zip"
  excludes    = ["node_modules", "tsconfig.json"]
}

data "archive_file" "square_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda-dist/square"
  output_path = "${path.module}/square.zip"
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
      COGNITO_USER_POOL_ID   = aws_cognito_user_pool.main.id
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
      STORE_ID                = var.store_id
      INVENTORY_TABLE         = aws_dynamodb_table.inventory.name
      SALES_HISTORY_TABLE     = aws_dynamodb_table.sales_history.name
      LOCAL_EVENTS_TABLE      = aws_dynamodb_table.local_events.name
      PRODUCTS_TABLE          = aws_dynamodb_table.products.name
      SQUARE_CONNECTION_TABLE = aws_dynamodb_table.square_connection.name
      SAGEMAKER_ENDPOINT_NAME = var.sagemaker_endpoint
      BEDROCK_MODEL_ID        = var.bedrock_model_id
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.main.id
    }
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

# Square POS OAuth (Owner only — connects Chris Emick's Square account)
resource "aws_lambda_function" "square" {
  filename         = data.archive_file.square_lambda.output_path
  function_name    = "${var.store_id}-square"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "square-api.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.square_lambda.output_base64sha256
  memory_size      = var.lambda_memory
  timeout          = 90

  environment {
    variables = {
      STORE_ID                 = var.store_id
      SQUARE_CONNECTION_TABLE  = aws_dynamodb_table.square_connection.name
      SQUARE_SSM_PREFIX        = "/${var.store_id}/${var.environment}/square"
      SQUARE_REDIRECT_URI      = "${aws_apigatewayv2_api.main.api_endpoint}/api/square/callback"
      FRONTEND_URL             = "https://${aws_cloudfront_distribution.frontend.domain_name}"
      SQUARE_SANDBOX           = "false"
      SALES_HISTORY_TABLE      = aws_dynamodb_table.sales_history.name
      PRODUCTS_TABLE           = aws_dynamodb_table.products.name
      INVENTORY_TABLE          = aws_dynamodb_table.inventory.name
    }
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

resource "aws_ssm_parameter" "square_application_id" {
  name  = "/${var.store_id}/${var.environment}/square/application_id"
  type  = "String"
  value = "REPLACE_WITH_SQUARE_APPLICATION_ID"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "square_application_secret" {
  name  = "/${var.store_id}/${var.environment}/square/application_secret"
  type  = "SecureString"
  value = "REPLACE_WITH_SQUARE_APPLICATION_SECRET"

  lifecycle {
    ignore_changes = [value]
  }
}

# Events Lambda (local events CRUD + static holidays)
resource "aws_lambda_function" "events" {
  filename         = data.archive_file.events_lambda.output_path
  function_name    = "${var.store_id}-events"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "manage-events.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.events_lambda.output_base64sha256
  memory_size      = var.lambda_memory
  timeout          = var.lambda_timeout

  environment {
    variables = {
      STORE_ID            = var.store_id
      LOCAL_EVENTS_TABLE  = aws_dynamodb_table.local_events.name
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.main.id
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

resource "aws_apigatewayv2_integration" "events" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.events.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "square" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.square.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Routes (matching current API)
resource "aws_apigatewayv2_route" "inventory_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/inventory"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_item" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/inventory/{upc}"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_product" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/inventory/products/{upc}"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/inventory"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_patch" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PATCH /api/inventory/{upc}"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_scan" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/inventory/scan"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_import" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/inventory/import"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "inventory_sync" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/inventory/sync"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "forecast" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/forecast"
  target             = "integrations/${aws_apigatewayv2_integration.forecast.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "profit" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/profit"
  target             = "integrations/${aws_apigatewayv2_integration.forecast.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "optimize" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/optimize"
  target             = "integrations/${aws_apigatewayv2_integration.forecast.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "assistant_chat" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/assistant/chat"
  target             = "integrations/${aws_apigatewayv2_integration.forecast.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "events_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/events"
  target             = "integrations/${aws_apigatewayv2_integration.events.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "events_post" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/events"
  target             = "integrations/${aws_apigatewayv2_integration.events.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "events_delete" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/events/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.events.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# User management routes (protected, role-checked in Lambda)
resource "aws_apigatewayv2_route" "users_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/users"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/users"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_update_role" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/users/{username}/role"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_disable" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/users/{username}/disable"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_enable" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/users/{username}/enable"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_reset_password" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/users/{username}/reset-password"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_remove_groups" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/users/{username}/remove-groups"
  target             = "integrations/${aws_apigatewayv2_integration.inventory.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Square POS — Owner only (JWT), except OAuth callback (public redirect from Square)
resource "aws_apigatewayv2_route" "square_status" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/square/status"
  target             = "integrations/${aws_apigatewayv2_integration.square.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "square_authorize" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/square/authorize"
  target             = "integrations/${aws_apigatewayv2_integration.square.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "square_disconnect" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/square/disconnect"
  target             = "integrations/${aws_apigatewayv2_integration.square.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "square_locations" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/square/locations"
  target             = "integrations/${aws_apigatewayv2_integration.square.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "square_sync" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/square/sync"
  target             = "integrations/${aws_apigatewayv2_integration.square.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "square_callback" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/square/callback"
  target    = "integrations/${aws_apigatewayv2_integration.square.id}"
}

# Nightly Square analytics sync (05:00 UTC ≈ 11pm–midnight Mountain)
resource "aws_cloudwatch_event_rule" "square_daily_sync" {
  name                = "${var.store_id}-square-daily-sync"
  description         = "Daily Square Orders/Catalog/Inventory sync into Hangar tables"
  schedule_expression = "cron(0 5 * * ? *)"

  tags = {
    Store       = var.store_id
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "square_daily_sync" {
  rule      = aws_cloudwatch_event_rule.square_daily_sync.name
  target_id = "square-lambda"
  arn       = aws_lambda_function.square.arn
  input     = jsonencode({ source = "scheduled-sync" })
}

resource "aws_lambda_permission" "events_square_sync" {
  statement_id  = "AllowEventBridgeSquareSync"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.square.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.square_daily_sync.arn
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

resource "aws_lambda_permission" "apigw_events" {
  statement_id  = "AllowAPIGatewayInvokeEvents"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.events.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_square" {
  statement_id  = "AllowAPIGatewayInvokeSquare"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.square.function_name
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

# =============================================================================
# Frontend Hosting: S3 + CloudFront for PWA
# Employees visit the CloudFront URL on their phones -> "Add to Home Screen"
# Results in a native-like app icon, standalone mode, offline capable.
# =============================================================================

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.store_id}-frontend-${var.environment}"

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
    Purpose     = "PWA Frontend Hosting"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Modern Origin Access Control (OAC) for CloudFront -> S3
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.store_id}-frontend-oac"
  description                       = "OAC for Hanger Liquor Store PWA"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    origin_id                = "S3Frontend"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # SPA/PWA routing: send all 404/403 to index.html so client router works
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Do not cache the service worker aggressively
  ordered_cache_behavior {
    path_pattern     = "/sw.js"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
    Purpose     = "PWA Frontend"
  }
}

# Allow CloudFront to read from the S3 bucket
data "aws_iam_policy_document" "frontend_bucket_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket_policy.json
}

# =============================================================================
# Cognito User Pool for Authentication & Access Control
# =============================================================================

resource "aws_cognito_user_pool" "main" {
  name = "${var.store_id}-users"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]

  tags = {
    Store       = var.store_id
    Environment = var.environment
    Project     = "HangarLiquorStore"
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.store_id}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = false

  # Token validity
  id_token_validity  = 1 # hours
  access_token_validity = 1
  refresh_token_validity = 30 # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_group" "owner" {
  name         = "Owner"
  user_pool_id = aws_cognito_user_pool.main.id
  precedence   = 1
  description  = "Store owner — full access including user management"
}

resource "aws_cognito_user_group" "manager" {
  name         = "Manager"
  user_pool_id = aws_cognito_user_pool.main.id
  precedence   = 2
  description  = "Manager — inventory edits and ReadOnly user creation"
}

resource "aws_cognito_user_group" "readonly" {
  name         = "ReadOnly"
  user_pool_id = aws_cognito_user_pool.main.id
  precedence   = 3
  description  = "Clerk — view inventory and forecasts"
}

# API Gateway JWT Authorizer using Cognito
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.store_id}-cognito"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.main.id]
    issuer   = "https://${aws_cognito_user_pool.main.endpoint}"
  }
}

# Outputs
output "frontend_url" {
  description = "CloudFront URL for the PWA. Share this (or the QR from /more) with staff."
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "cognito_issuer" {
  value = "https://${aws_cognito_user_pool.main.endpoint}"
}

output "api_url" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "inventory_table" {
  value = aws_dynamodb_table.inventory.name
}

output "products_table" {
  value = aws_dynamodb_table.products.name
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

output "square_oauth_redirect_uri" {
  description = "Register this exact Redirect URL in the Square Developer Console OAuth settings."
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/api/square/callback"
}

output "square_ssm_prefix" {
  description = "SSM path prefix for Square Application ID / Secret (Owner credentials stay server-side)."
  value       = "/${var.store_id}/${var.environment}/square"
}
