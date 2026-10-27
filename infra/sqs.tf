# 削除の予約。メッセージは遅延配信で、予定の時刻に削除用 Lambda へ届く
resource "aws_sqs_queue" "cleanup" {
  name = "${var.project}-cleanup"

  # 削除用 Lambda のタイムアウト (30秒) の6倍以上にする (Lambda の推奨)
  visibility_timeout_seconds = 180

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.cleanup_failed.arn
    maxReceiveCount     = 5
  })
}

# 5回続けて失敗したメッセージを残す。S3 のライフサイクル規則が最後に消す
resource "aws_sqs_queue" "cleanup_failed" {
  name                      = "${var.project}-cleanup-failed"
  message_retention_seconds = 14 * 24 * 60 * 60
}
