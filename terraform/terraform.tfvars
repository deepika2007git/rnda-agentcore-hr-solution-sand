aws_region            = "us-west-2"          # or your target region
project_name          = "rndc-agentcore-hr"  # any base name you like
environment           = "dev"               # dev / qa / prod
cognito_domain_prefix = "rnda-hr-dev"   # MUST be globally unique in region
frontend_bucket_force_destroy = true
bedrock_agent_runtime_arn = "arn:aws:bedrock-agentcore:us-west-2:637423277706:runtime/strands_agent-q2wAMh2q4r"
