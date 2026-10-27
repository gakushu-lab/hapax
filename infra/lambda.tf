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
      TABLE_NAME        = aws_dynamodb_table.main.name
      BUCKET_NAME       = aws_s3_bucket.files.id
      CLEANUP_QUEUE_URL = aws_sqs_queue.cleanup.url
      NODE_OPTIONS      = "--enable-source-maps"
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

# SQS のメッセージを1件ずつ削除用 Lambda に渡す。失敗したときに送り直す範囲を1件にするため
resource "aws_lambda_event_source_mapping" "cleanup" {
  event_source_arn = aws_sqs_queue.cleanup.arn
  function_name    = aws_lambda_function.cleanup.arn
  batch_size       = 1
}
