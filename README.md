# 和風スタンバイ時計

<p align="center">
  <img src="./sample.png" alt="和風スタンバイ時計の表示例" width="100%">
</p>

iPhone / iPad のスタンバイ表示を想定した、和暦・正刻・時辰・天気・月齢・六曜付きの時計です。
設定レイヤーを開いても時計本体は背面で描画を続け、実表示を見ながらその場で調整できます。

[公開ページ](https://kinoko34077.github.io/standby-display/)

## 主な機能

- 和暦 / 西暦の切替
- 正刻・時辰・天気・月齢・六曜の表示
- PWA 対応
- HUD 型の設定オーバーレイ
- 秒表示、時間形式、書字方向、フォント、色、表示情報の切替
- 日次のランダム色（時計・文字・背景）と色相・明度の範囲指定
- Android のタッチ操作に対応した色選択（iro.js、読み込み失敗時は標準色選択へフォールバック）
- `localStorage` への設定保存
- 現在設定の URL 共有

## 現在の構成

| ファイル | 役割 |
|---|---|
| `index.html` | 時計レイヤーと設定レイヤーの DOM |
| `style.css` | 時計表示、設定 HUD、レスポンシブレイアウト |
| `app.mjs` | エントリーポイント |
| `scripts/clock-app.mjs` | アプリ状態、同期、設定適用、UI 連携 |
| `scripts/settings.mjs` | 設定の既定値、URL / localStorage 変換 |
| `scripts/settings-ui.mjs` | 設定 UI のイベント処理と描画 |
| `scripts/random-colors.mjs` | 日付固定のランダム色生成と範囲正規化 |
| `scripts/formatters.mjs` | 時計・日付・付加情報の表示文字列生成 |
| `scripts/render.mjs` | DOM 反映 |
| `scripts/services.mjs` | 時刻同期、位置情報、天気、月齢、六曜取得 |
| `scripts/browser-features.mjs` | Wake Lock、ビューポート補正、Service Worker 登録 |
| `manifest.json` | PWA 設定 |
| `service-worker.js` | キャッシュ制御 |

## 設定 UI

- 半透明の全画面オーバーレイとして表示
- 必要時のみ部分表示へ切替
- 設定中も背面の時計は更新継続
- 変更は即時反映
- URL は共有 / 復元用、`localStorage` は常用設定用として使用
- 「毎日のランダム色」は日付ごとに同じ色を再現し、時計色・文字色を対象にする。背景色は別スイッチで有効化する。

色選択には、タッチスクリーン対応・依存なし・HSL/HSV 対応の [iro.js](https://iro.js.org/) 5.5.2 を使用しています。CDN が利用できない場合は既存の標準カラーピッカーへ戻ります。

## 今後の課題

- 旧字体変換辞書を内部モジュールとして拡張
- 実機での Wake Lock / PWA / Service Worker 更新確認
- フォント配信の完全ローカル化
