output "url" {
  value = "https://${var.domain}"
}

output "web_bucket" {
  value = aws_s3_bucket.web.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}
