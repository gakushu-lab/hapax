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

resource "aws_ssm_parameter" "cleanup_schedule_group" {
  name  = "/${var.project}/cleanup-schedule-group"
  type  = "String"
  value = aws_scheduler_schedule_group.cleanup.name
}

resource "aws_ssm_parameter" "cleanup_function_arn" {
  name  = "/${var.project}/cleanup-function-arn"
  type  = "String"
  value = aws_lambda_function.cleanup.arn
}

resource "aws_ssm_parameter" "cleanup_scheduler_role_arn" {
  name  = "/${var.project}/cleanup-scheduler-role-arn"
  type  = "String"
  value = data.aws_iam_role.scheduler_exec.arn
}

resource "aws_ssm_parameter" "cleanup_failed_queue_arn" {
  name  = "/${var.project}/cleanup-failed-queue-arn"
  type  = "String"
  value = aws_sqs_queue.cleanup_failed.arn
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
