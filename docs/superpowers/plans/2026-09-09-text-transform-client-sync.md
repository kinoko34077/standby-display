# Text Transform canonical client 同期 実装計画

## 1. 先行テスト（TDD）

- kinotch-apiにESM生成スクリプトのテストを追加し、canonical sourceからexportを保った生成物が出ること、生成ヘッダーがあることを確認する。
- standby-displayにvendor clientを読み込むclient契約テストを追加し、timeout/deadline、retry/backoff、Retry-After、不正payloadのfallbackを確認する。
- kanji conversionのAPI map取得テストを拡張し、契約probe不一致がlocal mapへ戻ること、成功時にcanonical mapへ差し替わることを確認する。
- sync/checkのテストを追加し、既定source、上書きsource、stale生成物を確認する。

## 2. canonical ESM生成

- kinotch-apiにcanonical sourceを読み込むESM generatorを追加する。
- `build:text-client` と `check:text-client` をpackage scriptsへ追加し、既存のbrowser client build/checkからも利用可能にする。
- `dist/text-transform.mjs` を生成し、生成物をgit管理するか、少なくともconsumer同期時に再生成可能な状態にする。

## 3. standby同期と利用

- `scripts/tools/sync-text-client.mjs` を追加する。既定sourceは `../kinotch-api`、`KINOTCH_API_DIR` / `--source` を受け付ける。
- source側のESM生成とstandby vendorへのコピーを行い、`check:text-client` で再生成結果とvendorの一致を検査する。
- `vendor/text-transform.mjs` を生成し、旧 `scripts/text-transform-client.mjs` へのimportとService Workerのprecacheを切り替える。
- package scriptsに `sync:text-client` と `check:text-client` を追加する。

## 4. fallback契約の強化

- `kanji-conversion.mjs` から旧clientのimportを削除し、vendor clientを利用する。
- local mapによる即時描画と、非同期の一回限り初期化を維持する。
- mapの文字数検証と `国亀気旧暦体` probe検証を追加し、失敗時はlocal mapを保持する。
- ruleSetHash/snapshotHashをfallback mapと比較しない。

## 5. ドキュメントと検証

- READMEまたは運用ドキュメントに同期手順、source上書き、生成物編集禁止、stale検査を追記する。
- kinotch-api/standby-display双方でテストとbuildを実行する。
- `git diff --check` と旧client参照検索を実施し、変更範囲がclient移譲・同期・fallback契約に限定されていることを確認する。

