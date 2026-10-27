# 削除に失敗した予約を残す。届くのは、EventBridge Scheduler が削除用 Lambda を呼べなかったものと、
# 削除用 Lambda が再試行しても失敗したもの。S3 のライフサイクル規則が最後に消す
resource "aws_sqs_queue" "cleanup_failed" {
  name                      = "${var.project}-cleanup-failed"
  message_retention_seconds = 14 * 24 * 60 * 60
}
