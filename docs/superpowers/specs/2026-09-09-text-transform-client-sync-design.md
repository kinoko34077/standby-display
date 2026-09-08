# Text Transform canonical client 同期設計

## 背景

`standby-display` は起動直後の表示をローカル旧字体mapで成立させ、バックグラウンドでAPIの正本mapへ差し替える構造を維持する。一方、API clientの実装が `standby-display/scripts/text-transform-client.mjs` と `kinotch-api/src/client/text-transform.js` に二重化しており、timeout、overall deadline、retry、Retry-After、response検証の差異が発生している。

## 目的

- `kinotch-api/src/client/text-transform.js` をclientの唯一の正本にする。
- `kinotch-api` から生成したESM clientを `standby-display/vendor/text-transform.mjs` に同期する。
- standby側のローカルfallback、非同期初期化、時刻・天気・六曜・月齢のサービス分離を維持する。
- 生成物の手編集とstale同期を検出できるようにする。

## 採用案

### 正本と生成

`kinotch-api/scripts/generate-text-client.mjs` がcanonical sourceを読み、exportを保持したESM生成物を `dist/text-transform.mjs` に出力する。既存のIIFE生成は維持する。両方の生成物に生成元と手編集禁止のヘッダーを付与する。

### consumer同期

`standby-display/scripts/tools/sync-text-client.mjs` は既定で `../kinotch-api` をsourceにし、`--source` または `KINOTCH_API_DIR` で上書きできる。source側のESM生成を実行してから `dist/text-transform.mjs` を `vendor/text-transform.mjs` へコピーする。`check:text-client` は正本から期待内容を再生成し、vendor生成物と直接比較してstaleを検出する。

### standbyの利用方法

`scripts/kanji-conversion.mjs` は `../vendor/text-transform.mjs` の `createTextTransformClient` をimportする。`KANJI_VARIANT_PAIRS` はfallback専用として残す。初期表示は同期的なlocal mapを使い、`initialize()` は一度だけAPIを呼ぶ。API失敗、timeout、429、5xx、不正response、契約不一致はいずれもlocal mapを継続する。

canonical map取得後は、入力/出力の文字数だけでなく、以下のprobeを検証する。

```text
国亀気旧暦体 -> 國龜氣舊曆體
```

remoteの `ruleSetHash` / `snapshotHash` をstandbyのfallback hashと比較しない。時計側が必要とする互換性をprobeと実対象mapで確認する。

### 変更しない範囲

- UI、PWAキャッシュ、Service Workerの基本仕様
- time/weather/rokuyo/moonの個別Serviceと既存リクエスト契約
- npm package化、API全体の巨大client化
- 自動デプロイ、GitHub Actions、ブランチ構成

## 検証

- canonical clientの生成結果とIIFE生成結果のstale検査
- standby vendor同期とsource変更時の検出
- timeout、overall deadline、retry/backoff、Retry-After、payload検証
- kanjiのAPI成功時差し替え、probe不一致時fallback、通信失敗時fallback
- standbyの既存互換性テスト、kinotch-apiの既存テスト、build、`git diff --check`
