resource "aws_dynamodb_table" "main" {
  name         = var.project
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # 削除は期限から数日遅れることがあるので保険にだけ使う
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
