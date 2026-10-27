# hapax

一時ファイル共有サービス。ブラウザでファイルを暗号化して送ると、期限と回数制限付きの URL が発行される。指定回数のダウンロードが終わるか期限が来ると、ファイルは削除される。サーバーは平文もファイル名も知らない。

https://hapax.tom.gakushu.now/

API の仕様 (Redoc): https://gakushu-lab.github.io/hapax/

## 仕組み

![構成図](docs/architecture.svg)

### 送る

1. ブラウザが 256bit の秘密鍵を作り、ファイルを 64KiB ごとに Advanced Encryption Standard Galois/Counter Mode (AES-GCM) で暗号化する
2. API が ID を発行し、S3 の署名付き PUT URL を返す
3. ブラウザが暗号文を S3 に直接送る。API は本体を通さない
4. URL `https://hapax.tom.gakushu.now/d/{id}#{秘密鍵}` を発行する。`#` 以降はサーバーに送られない
5. パスワードを付けた場合は、パスワードベースの鍵導出関数 (Password-Based Key Derivation Function 2, PBKDF2) でパスワードから鍵を導き、その鍵で秘密鍵を暗号化してから URL に入れる

### 受け取る

1. ブラウザが暗号化済みのファイル情報を取得し、URL の秘密鍵で復号して表示する
2. 「ダウンロード」で API が DynamoDB の条件付き更新で残り回数を減らし、S3 の署名付き GET URL (60秒) を返す
3. ブラウザが暗号文を受信して復号する

### 削除

| 手段 | 役割 |
|---|---|
| Amazon Simple Queue Service (SQS) の遅延配信 | 期限・回数切れ・放置されたアップロードを予定の時刻に削除する。遅延は最大15分なので、それより先の予約は削除用 Lambda が15分ごとに送り直す |
| S3 のライフサイクル規則 (8日)、DynamoDB の有効期限 (Time To Live, TTL) | 予約による削除が失敗し続けたファイルと行を消す |

## gakushu-lab の制約

gakushu-lab の tominaga アカウント (大阪リージョン) に置く。

| 制約 | hapax での扱い |
|---|---|
| IAM ロールを作れない | Lambda は既存の `LabLambdaExec`、GitHub Actions は既存の `LabGitHubDeploy` を使う |
| 使えるサービスが決まっている | EventBridge Scheduler は実行ロールが要るので使わない。削除の予約は SQS で行う |
| 1人 月 3 USD まで | 超えると翌月1日まで AWS の操作とデプロイが止まる。アプリは動いたまま。ファイルの上限を 100MiB にする |

## 技術

| 層 | 採用 |
|---|---|
| 配信 | CloudFront (Free プラン)、S3 (画面) |
| API | TypeScript + Hono on Lambda Web Function (Node.js 24) |
| データ | DynamoDB (メタデータと回数)、S3 (暗号文、1ファイル 100MiB まで) |
| 削除 | SQS、Lambda、S3 ライフサイクル規則 |
| 画面 | Vite + React、デジタル庁デザインシステム。表示モード (ライト・ダーク・OS に合わせる) はヘッダーで切り替える。アイコンは Phosphor |
| 暗号 | WebCrypto。本体は AES-GCM、鍵の導出は HMAC-based Key Derivation Function (HKDF) とパスワードベースの鍵導出関数 (Password-Based Key Derivation Function 2, PBKDF2) |
| 不正利用対策 | Turnstile、AWS WAF (IP アドレスごとに5分間300件)、Lambda Web Function のエンドポイントの上限 (毎秒100件) |
| 運用指標 | CloudWatch (埋め込みメトリクス形式とダッシュボード) |
| Infrastructure as Code (IaC) | Terraform。Lambda Web Function は Terraform が未対応なので `aws lambda-web deploy` で配置する |
| CI/CD | GitHub Actions。OpenID Connect (OIDC) で `LabGitHubDeploy` を引き受ける。長期のアクセスキーは使わない |
| テスト | Vitest (DynamoDB Local と S3Mock)、Playwright |

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

## 費用

CloudFront は Free プランで、AWS WAF の web ACL を含めて月額 0 USD。SQS (月100万要求) と Lambda (月100万要求) は期限の無い無料枠がある。DynamoDB のオンデマンドと S3 の保存量・要求は使った分だけ課金される。Lambda Web Function は要求数、処理中の CPU 時間、実行環境が動いている間のメモリで課金され、無料枠の記載は無い。
