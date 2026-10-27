# 削除の予約 (EventBridge Scheduler の1回だけのスケジュール) を入れるグループ。予約は API が作る
resource "aws_scheduler_schedule_group" "cleanup" {
  name = "${var.project}-cleanup"
}
