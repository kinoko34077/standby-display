# 変更・更新履歴

`standby-display` の実装変更とリモート反映を、Gitのコミット履歴および
`origin/main` の更新履歴に基づいて記録します。

## 記録基準

- 時刻はすべて日本時間（JST、`Asia/Tokyo`）です。
- 「コミット」はGitのコミット時刻、「プッシュ」はローカルに記録された
  `origin/main` の `update by push` 時刻です。
- 変更概要は各コミットの差分をもとに整理しています。
- Git単体にプッシュ時刻が残っていない場合は、プッシュ時刻を「不明」とします。

## 記録の範囲

以下の2026-09-06〜09-07表は当時の詳細なコミット・プッシュ記録です。
それ以降については、実装が受け入れられたGitHub Issue/PRを変更履歴の正本として参照します。
受入済みPRの個別差分・レビュー・CI・merge SHAは各リンク先で確認できます。
未mergeの実装ブランチで試行している内容を、公開済み機能として列挙しません。

## 2026-09-26〜2026-10-08（受入済みの主な変更）

| Issue / PR | 現行版へ反映された内容 |
|---|---|
| [#1 / PR #2](https://github.com/kinoko34077/standby-display/pull/2) | Wake Lock・設定操作・位置情報失敗時の復旧導線 |
| [#3 / PR #4](https://github.com/kinoko34077/standby-display/pull/4) | 旧字体変換fallbackの生成物同期 |
| [#5 / PR #10](https://github.com/kinoko34077/standby-display/pull/10) | Service Workerのキャッシュ整合 |
| [#12 / PR #13](https://github.com/kinoko34077/standby-display/pull/13) | 六曜の古い非同期応答による上書き防止 |
| [#14 / PR #15](https://github.com/kinoko34077/standby-display/pull/15) | DSEG7 Classic Mini Boldの時計フォント選択 |
| [#16 / PR #17](https://github.com/kinoko34077/standby-display/pull/17) | フォント寸法正規化とサイズ・字間調整 |
| [#18 / PR #19](https://github.com/kinoko34077/standby-display/pull/19) | 12進・16進・フランス十進時法などの時計方式 |
| [#20 / PR #21](https://github.com/kinoko34077/standby-display/pull/21) | 進法ごとのゼロ埋めと英字桁の大文字化 |
| [#22 / PR #23](https://github.com/kinoko34077/standby-display/pull/23) | 代替時法の正確な境界に同期する更新 |
| [#24 / PR #26](https://github.com/kinoko34077/standby-display/pull/26) | 点滅速度とDSEGの小型秒表示配置 |
| [#28 / PR #29](https://github.com/kinoko34077/standby-display/pull/29) | 時法ごとの秒境界と記号点滅の同期 |
| [#30 / PR #31](https://github.com/kinoko34077/standby-display/pull/31) | 主時計の中央配置・完全12進の小数精度 |
| [#32 / PR #34](https://github.com/kinoko34077/standby-display/pull/34) | 横幅に適応する設定インスペクター |
| [#35 / PR #39](https://github.com/kinoko34077/standby-display/pull/39) | 時分の視覚中心と完全16進ピリオドの間隔調整 |
| [#35 / PR #40](https://github.com/kinoko34077/standby-display/pull/40) | 縦向き画面での主時計中央配置修正 |

PR #27とPR #33は採用版ではなく、後続の受入済みPRに置き換えられた履歴です。
PR #38もその後の視覚再検証でPR #39により置き換えられました。

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
| 2026-09-07 23:08:15 | 不明（後続の `24b7fa0` が `main` に存在） | [`0adb979`](https://github.com/kinoko34077/standby-display/commit/0adb979058ed888342560acec8caf6295ad9cb22) | 旧字体変換を共通Text Transform APIの正本マップへ移行。起動時に一度だけAPIを呼び、初期表示・通信障害時はローカルfallbackを使用。API clientをService Workerの事前キャッシュへ追加。 |
| 2026-09-07 23:09:10 | 不明 | [`24b7fa0`](https://github.com/kinoko34077/standby-display/commit/24b7fa001b5b8851199821608754d66bff9620a5) | Text Transform API移行の運用・変更履歴を文書化。 |

## 補足

- 2026-09-06 23:14:26 に、リモートの `375210f` まで `main` を fast-forward 更新しています。これはコミット作成・プッシュではなく、作業開始時の同期操作です。
- 2026-09-06 23:13:47 に作成された `codex-temporary-stash-before-pull-2026-09-06` は、未コミット変更を保護するための一時stashです。`main` の機能変更やプッシュではないため、上表の変更履歴には含めていません。
