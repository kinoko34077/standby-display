# 変更・更新履歴

`standby-display` の実装変更とリモート反映を、Gitのコミット履歴および
`origin/main` の更新履歴に基づいて記録します。

## 記録基準

- 時刻はすべて日本時間（JST、`Asia/Tokyo`）です。
- 「コミット」はGitのコミット時刻、「プッシュ」はローカルに記録された
  `origin/main` の `update by push` 時刻です。
- 変更概要は各コミットの差分をもとに整理しています。
- Git単体にプッシュ時刻が残っていない場合は、プッシュ時刻を「不明」とします。

## 2026-09-06〜2026-09-07

作業開始時点の基準コミットは、2026-08-14 21:08:37 の `375210f`
（`Fix settings button icon sizing`）です。

| コミット時刻 | プッシュ時刻 | コミット | 変更内容 |
|---|---|---|---|
| 2026-09-06 23:26:40 | 2026-09-06 23:26:49 | [`2452e24`](https://github.com/kinoko34077/standby-display/commit/2452e241f6389a1aa0bb3233d6d2fe2cfe9d6a7f) | 日付が変わったときに六曜データを再取得するよう修正。日付更新処理を調整し、`sample.png` も更新。 |
| 2026-09-06 23:43:36 | 2026-09-06 23:43:43 | [`1abb248`](https://github.com/kinoko34077/standby-display/commit/1abb24857efe488ee20fe015bf5c43b3713bd07f) | 日次ランダム色を追加。時計色・文字色・背景色のランダム化、色相・明度範囲、設定保存・URL共有、タッチ向け色選択を追加。 |
| 2026-09-07 00:34:29 | 2026-09-07 00:34:38 | [`e4fdf78`](https://github.com/kinoko34077/standby-display/commit/e4fdf7850a6bab782308ed129a7d686b9cc2e637) | ランダム色の色相・明度スライダーに色のグラデーションを表示し、Androidなどで範囲を視覚的に確認できるよう改善。 |
| 2026-09-07 00:59:01 | 2026-09-07 00:59:07 | [`7dc0a71`](https://github.com/kinoko34077/standby-display/commit/7dc0a71e69a9a5a1c5daa8f4dd967b046826e54e) | ランダム色スイッチの切り替えごとに再抽選する仕組みを追加。再抽選番号を設定として保存・URL共有。 |
| 2026-09-07 01:08:02 | 2026-09-07 01:08:07 | [`f7bf162`](https://github.com/kinoko34077/standby-display/commit/f7bf16299218119d149d0b54050f9af96482ff29) | 時刻・天気・六曜・月齢APIのホストを旧Cloudflareアカウントから `kinotch.workers.dev` へ切り替え。 |
| 2026-09-07 01:21:06 | 2026-09-07 01:21:14 | [`e880d07`](https://github.com/kinoko34077/standby-display/commit/e880d07dd3948383736e0a36b164b1fbbef8f10d) | 色設定UIを独立モジュールへ分離。APIエンドポイントを定数へ集約し、時計表示モデル生成と位置情報表示判定の重複を整理。Service Workerの事前キャッシュ対象も更新。 |
| 2026-09-07 23:08:15 | 未実施（リモートpush承認待ち） | [`0adb979`](https://github.com/kinoko34077/standby-display/commit/0adb979058ed888342560acec8caf6295ad9cb22) | 旧字体変換を共通Text Transform APIの正本マップへ移行。起動時に一度だけAPIを呼び、初期表示・通信障害時はローカルfallbackを使用。API clientをService Workerの事前キャッシュへ追加。 |

## 補足

- 2026-09-06 23:14:26 に、リモートの `375210f` まで `main` を fast-forward 更新しています。これはコミット作成・プッシュではなく、作業開始時の同期操作です。
- 2026-09-06 23:13:47 に作成された `codex-temporary-stash-before-pull-2026-09-06` は、未コミット変更を保護するための一時stashです。`main` の機能変更やプッシュではないため、上表の変更履歴には含めていません。
