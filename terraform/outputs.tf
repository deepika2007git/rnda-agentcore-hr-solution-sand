output "frontend_bucket_name" {
  description = "Name of the S3 bucket used for the frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_domain_name" {
  description = "CloudFront URL for the frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.this.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool App Client ID"
  value       = aws_cognito_user_pool_client.spa_client.id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = aws_cognito_user_pool_domain.this.domain
}
