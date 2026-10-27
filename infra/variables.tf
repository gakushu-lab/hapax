variable "project" {
  type    = string
  default = "hapax"
}

variable "region" {
  type    = string
  default = "ap-northeast-3"
}

variable "domain" {
  type    = string
  default = "hapax.tom.gakushu.now"
}

# 研修環境で社員ごとに用意されたホストゾーン
variable "zone" {
  type    = string
  default = "tom.gakushu.now"
}

# aws lambda-web deploy で作った Lambda Web Function のエンドポイントのドメイン (https:// は付けない)
variable "api_domain" {
  type = string
}

variable "turnstile_secret" {
  type      = string
  sensitive = true
}
