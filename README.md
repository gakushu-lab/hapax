# hapax

ファイルを暗号化して送る一時共有サービス。URL を知っている人だけが、決めた回数と期限の範囲でダウンロードできる。サーバーはファイルの中身も名前も読めない。1ファイル 100MiB まで。

https://hapax.tom.gakushu.now/

API の仕様: https://gakushu-lab.github.io/hapax/

## 仕組み

![構成図](docs/architecture.svg)

1. 送る人のブラウザがファイルを暗号化して S3 に置く
2. 復号の鍵は URL の `#` 以降に入れる。`#` 以降はサーバーに送られない
3. 受け取る人のブラウザが S3 から取得して URL の鍵で復号する
4. 回数か期限に達するとファイルを削除する

## 技術

| 層 | 採用 |
|---|---|
| 画面 | React、デジタル庁デザインシステム |
| API | Hono、Lambda Web Function |
| データ | DynamoDB、S3 |
| 削除 | EventBridge Scheduler、Lambda |
| 暗号 | Web Crypto API |
| インフラ | Terraform、GitHub Actions |
| テスト | Vitest、Playwright |

## 開発

```sh
pnpm install
docker compose up -d   # DynamoDB Local と S3Mock
pnpm db-init
pnpm api               # API: http://127.0.0.1:8787
pnpm dev               # 画面: http://127.0.0.1:5173
pnpm test              # API と暗号化のテスト
pnpm e2e               # ブラウザでの送受信
```
