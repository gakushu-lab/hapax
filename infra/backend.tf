terraform {
  # バケットは手順2で作る。名前の数字は tominaga のアカウント ID
  backend "s3" {
    bucket       = "hapax-tfstate-090213310133"
    key          = "hapax/terraform.tfstate"
    region       = "ap-northeast-3"
    use_lockfile = true
    encrypt      = true
  }
}
