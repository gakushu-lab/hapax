// CloudFront Functions (cloudfront-js-2.0)
// 拡張子の無いパスは画面の URL なので index.html を返す
// CloudFront が名前で呼び出すので、ファイルの中では使わない
// oxlint-disable-next-line no-unused-vars
function handler(event) {
  var request = event.request;
  if (!request.uri.includes(".")) {
    request.uri = "/index.html";
  }
  return request;
}
