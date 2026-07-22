variable "region" {
  description = "AWS region for deployment (use client's preferred)"
  type        = string
  default     = "us-east-2"
}

variable "store_id" {
  description = "Store identifier (e.g. 'hanger' for Hangar Liquor)"
  type        = string
  default     = "hanger"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "lambda_memory" {
  description = "Memory allocation for Lambda functions (MB)"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions (seconds)"
  type        = number
  default     = 30
}

variable "sagemaker_endpoint" {
  description = "Optional SageMaker Serverless endpoint name for Canvas model (leave empty for statistical only)"
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Optional Bedrock model id for Hangar AI chat (empty = grounded fallback only)"
  type        = string
  default     = ""
}
