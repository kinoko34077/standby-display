# standby-display 境界ハードニング設計

## 目的

通常版の責務分離・起動fallback・個別Serviceは維持したまま、監査で確認された実害のある境界を閉じる。

対象は次のとおり。

1. legacy版の時刻・天気API末尾slash不一致
2. Service Workerの固定cache名とcache-firstによる更新停滞
3. Workers Builds入口に対するrelease gate不足
4. 天気cacheと位置情報の不整合
5. legacy/modernのdomain知識重複を検出するcross-test不足
6. 既存canonical Text Transform client同期の正式化と文書整合

iro.js・Google Fonts・Digital-7 fontの完全local化は依存取得・ライセンス確認を伴うため、今回の動作修正から分離し、READMEに後続課題として明記する。

## 採用方針

### Legacy API URL

`legacy/clock.js` は共有configのroute URLをそのまま渡す。時刻は `/v1/time`、天気は `/v1/weather?lat=...&lon=...` とし、calendar/moonの既存形式は変更しない。テストはURLのorigin、pathname、queryを検証する。

### Service Worker更新戦略

cache名を `wafu-clock-compat-v2` に更新し、既存cacheをactivate時に削除する。navigation、HTML、JavaScript、CSS、moduleはnetwork-firstとし、通信失敗時のみ同一URLのcacheへfallbackする。画像・fontなどその他のsame-origin GETはcache-firstを維持する。install時のprecacheは既存の静的リストを維持する。

### Release gate

asset生成を `build:assets` に分離し、`verify` を `npm test && npm run build:assets` とする。`build` はverifyを入口にし、`deploy` もverify完了後にWranglerを実行する。Workers Buildsのbuild commandは `npm run verify` とREADMEに明記する。

### Weather cache identity

weather cacheは既存storage keyを維持し、payloadに `lat` と `lon` を追加する。cache利用条件は、timestampがTTL内で、保存地点と現在地点の距離が許容閾値以内であること。旧形式や不正値はcache missとして扱う。URLの緯度経度と同じ精度で比較できるよう、距離判定は小さな固定閾値を使う。

### Legacy/modern parity

iOS 9向けlegacyをmodern moduleへimport統合しない。代わりに複数の日付、月替わり、正刻境界、時辰境界を同じfixtureで比較し、domain知識のずれを検出する。productionのES5境界は維持する。

### Canonical Text Transform

既存の `kinotch-api` 正本 → ESM生成物 → `standby-display/vendor` 同期を保持する。時計はlocal旧字体mapで即時起動し、API成功後にのみcanonical mapへ交換する。timeout、deadline、retry、Retry-After、response validation、契約probeは生成clientと既存fallbackテストで検証する。

## エラー処理

- legacy API失敗時は時計を停止せず、既存の表示fallbackを継続する。
- Service Workerのnetwork-firstで通信失敗時はcacheを返し、HTTPエラーはそのまま返す。
- 不正・古いweather cacheは無視してAPI取得へ進む。
- verify失敗時はbuild/deployを継続しない。

## 検証

- legacyのexact URLテスト
- Service Workerのnetwork-first更新・offline fallback・cache-first画像テスト
- package scriptのverify/deploy gateテスト
- weather cacheの同地点再利用・地点変更miss・旧形式missテスト
- legacy/modern parity fixtureテスト
- standby/kinotch-apiの既存Text Transform同期・全テスト・build
- `git diff --check` と旧APIホスト検索

