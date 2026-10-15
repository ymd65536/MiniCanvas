# MiniCanvas

GitHub Copilot appのCanvas Extension開発を始めるための、フレームワーク不要のテンプレートです。
サンプルの **Minimum Canvas** は起動状態とカウンターを表示します。
外部API、認証、データベース、npm依存関係の追加は不要です。

## Canvas・Canvas Extension・Pluginの違い

| 用語 | このリポジトリでの役割 | 識別子 |
| --- | --- | --- |
| Canvas | Copilot app内で開く画面。複数インスタンスを開けます | `minimum-canvas` |
| Canvas Extension | SDKでCanvasを登録し、画面を配信するNode.jsプロセス | `copilot-extension.json`の`name: "mini-canvas"` |
| Plugin | Extensionなどをまとめてインストール・配布するパッケージ | `plugins/mini-canvas/plugin.json`の`name: "mini-canvas"` |

Extensionの`version: 1`は既存の数値のまま維持しています。
Pluginの`version: "0.0.1"`とは別のメタデータです。

## 必要な環境

- Canvasと`@github/copilot-sdk/extension`の`createCanvas()`に対応したGitHub Copilot app
- ローカルの生成・テスト用にNode.js 20.19以降（CIはNode.js 22）
- PluginのCLIインストールを使う場合はCopilot CLI

SDKはExtensionを起動するホストが提供します。`npm install`は不要です。
古いCopilot CLIにはCanvas APIがない場合があり、CLIだけではCanvasの画面を表示できません。

## ファイル構成と役割

```text
.github/
├── extensions/mini-canvas/            # 開発する正本
│   ├── extension.mjs                  # SDK登録・HTTP配信・ライフサイクル
│   ├── copilot-extension.json         # Extension名とバージョン
│   ├── index.html                     # 画面のHTML
│   ├── app.mjs                        # ブラウザ側の初期化・カウンター操作
│   └── styles.css                     # レイアウト・ライト／ダーク表示
└── workflows/check.yml                # テストと配布ファイルの整合性チェック
plugins/mini-canvas/
├── plugin.json                        # Canvas配布用Pluginのマニフェスト
└── com.github.copilot/extensions/mini-canvas/
    ├── extension.mjs                  # 以下5ファイルは正本から生成
    ├── copilot-extension.json
    ├── index.html
    ├── app.mjs
    └── styles.css
scripts/sync-plugin.mjs                # 配布ファイルの生成・差分検出
tests/                                # Node.js標準テスト（SDKホスト境界はスタブ）
plugin.json                           # 既存Skill用の別Plugin
skills/azure-cost-health-check/SKILL.md # 既存Skill（変更せず保持）
AGENTS.md                              # このテンプレートを開発する際のルール
LICENSE                                # MITライセンス
```

ルートの`minicanvas-skills` Pluginは既存Skill用です。
Canvas配布用Pluginとは分離しており、SkillをCanvas配布物へ追加してはいません。
このSkillが参照するAzure用Canvasは本テンプレートには含まれません。

## Canvas Extensionの開発方法

1. このリポジトリをテンプレートとして使用するか、cloneします。
2. **`.github/extensions/mini-canvas/index.html`を編集して画面構造を作成**します。
3. **`app.mjs`を編集して初期化・DOM操作・表示ロジックを実装**します。
4. **`styles.css`を編集してレイアウトと配色を調整**します。
5. Canvasを閉じて開き直し、変更を確認します。

`extension.mjs`にはHTMLやCSSを埋め込まず、Canvas登録とライフサイクル管理を置きます。
サーバーは`127.0.0.1`のエフェメラルポートを使い、`/`と`/index.html`、
`/app.mjs`、`/styles.css`だけを適切なContent-Typeで配信します。
リクエストパスをファイルパスへ変換しないため、パストラバーサルを防止します。
未登録パスは404、GET・HEAD以外は405です。

同じ`ctx.instanceId`の同時オープンは1つのサーバーを共有し、異なるインスタンスは別の
サーバーを使います。`onClose()`で対応するサーバーと接続を閉じます。
配信ファイルは起動時に読み込むため、HTML/CSS/JSの編集後はブラウザの再読み込みだけでなく
**Canvasを閉じて開き直してください**。Extension自体を変更した場合はホスト側の再読み込み・再起動も必要です。

新しい製品名に変える場合はCanvasの`id`、`displayName`、`description`、開いた際のタイトル、
HTML内の表示とREADMEを揃えます。Extension名とCanvas IDは別々の識別子として扱ってください。
配信ファイルを増やす場合は`extension.mjs`の許可リスト、生成スクリプトのファイル一覧、
テストも更新します。

## GitHub Copilot appでの利用方法

### プロジェクトのExtensionとして開発

1. Copilot appでこのリポジトリを作業ディレクトリとするプロジェクト／セッションを開きます。
2. ホストが`.github/extensions/mini-canvas/`を検出し、有効になっていることを確認します。
   検出されない場合はセッションやappを再起動してください。
3. Canvas一覧で **Minimum Canvas** を開くか、チャットで
   「`minimum-canvas` Canvasを新しいインスタンスで開いて」と依頼します。
4. 起動表示、JavaScriptの準備完了表示、ボタンによるカウント増加を確認します。

### Pluginとして利用

既存のサブディレクトリ指定のインストール方式を維持しています。

```sh
copilot plugin install ymd65536/MiniCanvas:plugins/mini-canvas
```

インストール後、Copilot appを再起動し、Plugin／Extensionが有効であることを確認して
Minimum Canvasを開きます。フォークから配布する場合はコマンドの`ymd65536/MiniCanvas`を
自分の`owner/repo`に置き換えてください。リモートインストールは公開済みの配布物を使い、
未pushのローカル編集や未マージのPRの変更は反映しません。

プロジェクト版・ユーザースコープ版・Plugin版を同時に有効にしないでください。
同じCanvas IDが複数プロバイダーから登録される場合は、使わないインストールを無効化するか
アンインストールしてから再起動します。

既存Skill用のルートPluginを使う場合のコマンドは別です。

```sh
copilot plugin install ymd65536/MiniCanvas
```

## Pluginとして配布する方法

`.github/extensions/mini-canvas/`だけを編集し、次をリポジトリルートで実行します。

```sh
node scripts/sync-plugin.mjs
node scripts/sync-plugin.mjs --check
node --test
```

生成した5ファイルもcommit・pushしてください。リモートからのインストール時に生成処理は走りません。
`plugins/mini-canvas/com.github.copilot/extensions/mini-canvas/`は**手動編集しません**。
生成は既存ファイルを上書きし、`--check`は書き込まずに内容とファイル一覧の一致を検証します。
欠落・余分なファイル・不一致はエラーになり、CIでも同期漏れを検出します。
余分なファイルは自動削除しません。意図したファイルかを確認して整理してください。

Pluginは[Agent Plugins 1.0仕様](https://agent-plugins.org/specification)に従います。
ルートの`plugin.json`に標準のメタデータを置き、Copilot固有のExtension配布物は
`com.github.copilot/extensions/`に置きます。SkillはPluginルートの`skills/`から検出されるため、
マニフェストに非標準の`skills`プロパティは追加しません。
以前の`.github/plugin/plugin.json`はルートの`plugin.json`へ移し、既存Skillの名前と内容を保持しています。

参考:
- [GitHub: Pluginの形式と構成](https://docs.github.com/en/copilot/concepts/agents/about-plugins)
- [GitHub: Pluginのコマンドとマニフェスト](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
- [Copilot SDK: Extensionの検出と起動](https://github.com/github/copilot-sdk/blob/main/nodejs/docs/extensions.md)

## 動作確認

### 自動テスト

```sh
node --test
node scripts/sync-plugin.mjs --check
```

Node.js標準ライブラリだけで以下を検証します。

- 全`.mjs`の`node --check`、全JSONのパース、Pluginの基本的なマニフェスト制約
- 正本・Plugin版それぞれの起動ハンドラーと3ファイルのHTTP配信、MIME Type
- 404、パストラバーサル、HEAD、未対応メソッド
- 同時オープン、複数インスタンス、閉じた後の接続拒否、再オープン
- ファイル欠落時の起動失敗と再試行、起動中のクローズ
- ブラウザ側コードの初期化とカウンター操作（最小DOMスタブ）
- 配布物の一致、生成の再実行、欠落・余分なファイル・同期漏れの検出

テストではSDKの`joinSession()`と`createCanvas()`をスタブに置き換えます。
**実際のCopilot appへの登録・表示・Pluginインストールの成功を保証するテストではありません**。

### Copilot appでの手動確認

1. Minimum Canvasを開き、タイトルと「The Canvas Extension is running.」を確認します。
2. 「JavaScript is ready.」が表示され、ボタンが有効になることを確認します。
3. ボタンを複数回押し、カウンターが0、1、2…と増えることを確認します。
4. ウィンドウを狭くし、ライト／ダーク環境で文字とフォーカスが読みやすいことを確認します。
5. 別の新しいCanvasインスタンスを開き、片方の操作が他方に影響しないことを確認します。
6. 一方を閉じ、他方が引き続き動作することを確認します。
7. 開発者ツール等で取得した閉じたCanvasのURLに`curl`し、接続できなくなったことを確認します。
8. Plugin版でも同じ操作を行います。ローカル版との二重登録を避けてください。

今回のローカル検証ではNode.js 20.19で7テストが成功しました。
通常のブラウザでも3ファイルの読み込み、カウントの0→3への増加、幅320px／900pxでの
ライト／ダーク配色と横方向にはみ出さないことを確認しています。
インストール済みappのSDKの実際の`createCanvas()`でもHTTP 200まで確認しましたが、
この確認でも`joinSession()`はスタブです。
通常のブラウザでの確認とCopilot app実機での確認は異なります。
実機でのExtension登録、Plugin再インストール、app内のテーマ連携は別途確認が必要です。

## 既知の制約事項

- Canvas APIは実験的なSDKの機能であり、対応状況やUIはホストのバージョンによって変わります。
- `node extension.mjs`を直接実行しても、ホストのSDK解決とセッションがないため通常は起動できません。
- ローカルサーバーに認証はありません。機密データを置かず、公開ネットワークにもバインドしないでください。
- カウンターはページごとのメモリーだけに保持され、再読み込みや再オープンでリセットされます。
- 配色は標準の`prefers-color-scheme`で切り替えます。app固有のテーマAPIは使用しません。
- Pluginの`extensions.com.github.copilot.logo`はCanvasのアイコン指定とは別です。
  独自アイコンの表示は未確認のためロゴ設定と4か所の重複`assets/preview.png`は除去しました。
  未確認の`icon`プロパティは追加していません。
- このテンプレートはローカル開発用の小さな静的サーバーであり、汎用Webサーバーではありません。

## ライセンス

[MIT](./LICENSE)
