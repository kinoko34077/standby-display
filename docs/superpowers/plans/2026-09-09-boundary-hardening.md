# standby-display 境界ハードニング実装計画

## Task 1: Legacy API URLの正規化

対象: \`legacy/clock.js\`, \`tests/compatibility.test.mjs\`

1. mock XHRに対して時刻URLが \`/v1/time\`、天気URLのpathnameが \`/v1/weather\` であることを先に追加する。
2. 失敗を確認する。
3. \`api.clock + "/" \` と \`api.weather + "/?"\` をroute URL直結へ修正する。
4. 六曜・月齢の既存query形式とAPI障害時の時計継続を確認する。

## Task 2: 天気cacheの位置identity

対象: \`scripts/services.mjs\`, \`scripts/constants.mjs\`, 新規 \`tests/services.test.mjs\`

1. 同一地点のTTL内再利用、地点変更時の再取得、旧形式cacheのmissを先にテストする。
2. cache payloadへ \`lat\` / \`lon\` を保存し、一定距離以内だけTTL cacheを利用する。
3. malformed cacheは従来どおり無視し、既存のAPI fallbackを維持する。

## Task 3: Service Worker更新戦略

対象: \`service-worker.js\`, 新規 \`tests/service-worker.test.mjs\`

1. cached旧JSがあってもnetworkの新JSを返すこと、offline時はcached JSへ戻ること、画像はcache-firstであることをテストする。
2. cache名をv2へ更新し、dynamic code（navigation/HTML/JS/CSS/module）はnetwork-first、その他はcache-firstへ分岐する。
3. activate時の旧cache削除とinstallのprecacheを確認する。

## Task 4: Release gate

対象: \`package.json\`, \`tools/build-assets.mjs\`, \`README.md\`, 新規 \`tests/release-gate.test.mjs\`

1. \`verify\`、\`build:assets\`、\`build\`、\`deploy\`の契約を先にテストする。
2. asset生成を \`build:assets\` に分離し、\`verify\` を \`npm test && npm run build:assets\` とする。
3. \`build\` と \`deploy\` はverifyを経由する構成にする。
4. Workers Buildsのbuild commandを \`npm run verify\` とREADMEに明記する。

## Task 5: Parityテスト・canonical client・文書

対象: \`tests/compatibility.test.mjs\`, README、CHANGELOG、既存Text Transform同期ファイル

1. 月替わり・正刻境界・時辰境界を含むlegacy/modern parity fixtureを追加する。
2. canonical clientのvendor/stale検査が現行のまま通ることを確認し、重複clientの再発防止を文書化する。
3. READMEの旧字体記述、公開先、Workers Builds責任境界を現状へ合わせる。
4. CHANGELOGの「push待ち」など現状と矛盾する表記を更新する。

## 最終検証

- \`npm test\`
- \`npm run verify\`
- \`npm run check:text-client\`
- \`npm run build\`
- \`git diff --check\`
- 旧APIホストと旧client参照のrepo全体検索

