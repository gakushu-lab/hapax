# CD が参照する値
resource "aws_ssm_parameter" "web_bucket" {
  name  = "/${var.project}/web-bucket"
  type  = "String"
  value = aws_s3_bucket.web.id
}

resource "aws_ssm_parameter" "distribution_id" {
  name  = "/${var.project}/cloudfront-distribution-id"
  type  = "String"
  value = aws_cloudfront_distribution.main.id
}

# API (Lambda Web Function) の環境変数。aws lambda-web deploy の --env で渡す
resource "aws_ssm_parameter" "table_name" {
  name  = "/${var.project}/table-name"
  type  = "String"
  value = aws_dynamodb_table.main.name
}

resource "aws_ssm_parameter" "files_bucket" {
  name  = "/${var.project}/files-bucket"
  type  = "String"
  value = aws_s3_bucket.files.id
}

resource "aws_ssm_parameter" "cleanup_queue_url" {
  name  = "/${var.project}/cleanup-queue-url"
  type  = "String"
  value = aws_sqs_queue.cleanup.url
}

resource "aws_ssm_parameter" "origin_secret" {
  name  = "/${var.project}/origin-secret"
  type  = "SecureString"
  value = random_password.origin_secret.result
}

resource "aws_ssm_parameter" "turnstile_secret" {
  name  = "/${var.project}/turnstile-secret"
  type  = "SecureString"
  value = var.turnstile_secret
}
