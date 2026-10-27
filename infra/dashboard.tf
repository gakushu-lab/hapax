locals {
  events = [
    "upload_created", "upload_completed", "consumed",
    "deleted_consumed", "deleted_expired", "deleted_unused", "deleted_abandoned",
  ]
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = var.project

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 12, height = 6
        properties = {
          title   = "イベント数 (1時間ごと)"
          region  = var.region
          view    = "timeSeries"
          stat    = "Sum"
          period  = 3600
          metrics = [for e in local.events : ["hapax", "Count", "Event", e]]
        }
      },
      {
        type = "metric", x = 12, y = 0, width = 12, height = 6
        properties = {
          title  = "期限切れのうち一度も受信されなかった割合 (%、1日ごと)"
          region = var.region
          view   = "timeSeries"
          period = 86400
          metrics = [
            [{ expression = "100 * unused / (unused + expired + consumed)", label = "未使用率", id = "rate" }],
            ["hapax", "Count", "Event", "deleted_unused", { id = "unused", stat = "Sum", visible = false }],
            ["hapax", "Count", "Event", "deleted_expired", { id = "expired", stat = "Sum", visible = false }],
            ["hapax", "Count", "Event", "deleted_consumed", { id = "consumed", stat = "Sum", visible = false }],
          ]
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          title  = "API の応答"
          region = var.region
          view   = "timeSeries"
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/Lambda/Web", "ExecutedRequests", "FunctionName", "${var.project}-api", "EndpointName", "prod"],
            ["AWS/Lambda/Web", "HTTPResponseStatusClass4XX", "FunctionName", "${var.project}-api", "EndpointName", "prod"],
            ["AWS/Lambda/Web", "HTTPResponseStatusClass5XX", "FunctionName", "${var.project}-api", "EndpointName", "prod"],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6
        properties = {
          title  = "API の上限で断った要求 (429)"
          region = var.region
          view   = "timeSeries"
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/Lambda/Web/Usage", "EndpointRequestThrottles", "FunctionName", "${var.project}-api", "EndpointName", "prod", "ExecutionRegion", var.region],
            ["AWS/Lambda/Web/Usage", "EndpointActiveEnvironmentThrottles", "FunctionName", "${var.project}-api", "EndpointName", "prod", "ExecutionRegion", var.region],
          ]
        }
      },
      {
        type = "metric", x = 0, y = 12, width = 12, height = 6
        properties = {
          title  = "削除用 Lambda"
          region = var.region
          view   = "timeSeries"
          period = 300
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.cleanup.function_name, { stat = "Sum" }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.cleanup.function_name, { stat = "Sum" }],
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.cleanup_failed.name, { stat = "Maximum", label = "失敗して残ったメッセージ", yAxis = "right" }],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 12, width = 12, height = 6
        properties = {
          title  = "保存中のファイル (S3、1日ごと)"
          region = var.region
          view   = "timeSeries"
          stat   = "Average"
          period = 86400
          metrics = [
            ["AWS/S3", "NumberOfObjects", "BucketName", aws_s3_bucket.files.id, "StorageType", "AllStorageTypes"],
            ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.files.id, "StorageType", "StandardStorage", { yAxis = "right" }],
          ]
        }
      },
    ]
  })
}
