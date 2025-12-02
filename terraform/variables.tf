variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Base name for all resources"
  type        = string
}

variable "environment" {
  description = "Environment identifier (e.g. dev, qa, prod)"
  type        = string
  default     = "dev"
}

variable "cognito_domain_prefix" {
  description = "Unique prefix for the Cognito hosted UI domain (must be globally unique in the region)"
  type        = string
}

variable "frontend_bucket_force_destroy" {
  description = "Allow bucket to be destroyed even if it contains objects (use carefully in non-prod)"
  type        = bool
  default     = true
}
