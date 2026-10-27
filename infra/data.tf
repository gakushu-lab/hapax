data "aws_route53_zone" "main" {
  name = var.zone
}

data "aws_caller_identity" "current" {}

# gakushu-lab が用意した Lambda の実行ロール。社員は IAM ロールを作れない
data "aws_iam_role" "lambda_exec" {
  name = "LabLambdaExec"
}
