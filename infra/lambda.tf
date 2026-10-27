# 削除用 Lambda。API は Lambda Web Function で、Terraform が対応していないので aws lambda-web deploy で作る

# 初回はダミーのコードで作り、本物のコードは CD (aws lambda update-function-code) で入れる
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda-placeholder.zip"

  source {
    content  = "export const handler = async () => {};"
    filename = "cleanup.mjs"
  }
}

resource "aws_lambda_function" "cleanup" {
  function_name = "${var.project}-cleanup"
  role          = data.aws_iam_role.lambda_exec.arn
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  handler       = "cleanup.handler"
  memory_size   = 256
  timeout       = 30

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      TABLE_NAME   = aws_dynamodb_table.main.name
      BUCKET_NAME  = aws_s3_bucket.files.id
      NODE_OPTIONS = "--enable-source-maps"
    }
  }

  # コードは CD が更新するので、Terraform では差分を見ない
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_cloudwatch_log_group.cleanup]
}

resource "aws_cloudwatch_log_group" "cleanup" {
  name              = "/aws/lambda/${var.project}-cleanup"
  retention_in_days = 14
}

# EventBridge Scheduler は削除用 Lambda を非同期で呼ぶ。Lambda が再試行しても失敗したら、失敗用のキューに送る
resource "aws_lambda_function_event_invoke_config" "cleanup" {
  function_name          = aws_lambda_function.cleanup.function_name
  maximum_retry_attempts = 2

  destination_config {
    on_failure {
      destination = aws_sqs_queue.cleanup_failed.arn
    }
  }
}
