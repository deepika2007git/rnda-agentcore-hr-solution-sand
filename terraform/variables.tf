variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Base name for all resources (e.g. rnda-agentcore-hr)"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. sandbox, dev, qa, prod)"
  type        = string
  default     = "dev"
}

variable "cognito_domain_prefix" {
  description = "Unique prefix for the Cognito hosted UI domain (must be unique in region)"
  type        = string
}

variable "frontend_bucket_force_destroy" {
  description = "Allow destroying frontend bucket even if it has objects (true only for non-prod / labs)"
  type        = bool
  default     = true
}
