# CloudFront の Free プラン。ディストリビューションと web ACL を1つずつ含める
resource "aws_pricingplanmanager_subscription" "main" {
  plan_family = "CloudFront"
  plan_tier   = "FREE"

  resource_arns = [
    aws_cloudfront_distribution.main.arn,
    aws_wafv2_web_acl.main.arn,
  ]
}
