# Java Bronze 模試アプリ

## 問題データ管理

問題データは [backend/data/questions.csv](backend/data/questions.csv) で管理します。Excelで編集して保存できます。CSVは次の8列を使用します。

```text
id,category,text,optionA,optionB,optionC,optionD,optionE,optionF,correctIndexes,explanation
```

`correctIndexes` は正解の選択肢を0から数えた値です。複数正解の場合は `2|3` のように `|` で区切ります。`explanation` に正解の理由や補足説明を入力します。カテゴリーはCSVから動的に生成されます。現在は第1章の実データ11問と、残りのダミー問題129問が入っています。

## 起動方法

Windowsでは、プロジェクトのルートで次のコマンドを実行すると、Javaバックエンドを別ウィンドウで起動し、フロントエンドも開始できます。

```powershell
npm run start:app
```

または `start.ps1` を右クリックしてPowerShellで実行します。表示されたViteのURLをブラウザで開いてください。停止時は、フロントエンドとJavaバックエンドの各ウィンドウで `Ctrl+C` を押します。

ターミナルを2つ使います。

```powershell
# ターミナル1: Javaバックエンド
New-Item -ItemType Directory -Force backend\build
javac --add-modules jdk.httpserver -d backend\build backend\QuestionServer.java
Push-Location backend
java --add-modules jdk.httpserver -cp build QuestionServer

# ターミナル2: Reactフロントエンド
npm run dev
```

バックエンドは `http://localhost:8080`、フロントエンドは `http://localhost:5173` で起動します。フロントエンドは `/api/categories` でカテゴリー一覧を、`/api/questions/random` でCSVからランダムに60問を取得します。

完了したテスト結果はブラウザの `localStorage` に直近3回分保存されます。同じPC・同じブラウザで再度開いた場合、復習画面から過去3回分を選択できます。

## 配布用アプリの作成

JDKとNode.jsが入っている開発PCで、次を実行します。リリース作成時はTypeScriptを検査した後、フロントエンドを静的バンドルします。

```powershell
npm run release
```

`release\JavaBronzeStudy\JavaBronzeStudy.exe` が生成されます。このフォルダ一式を利用者PCへ渡し、`JavaBronzeStudy.exe` を実行するとJavaバックエンドと画面が起動します。その後、ブラウザで `http://localhost:8080` を開きます。利用者側にNode.jsやMavenは不要です。

この方式はWindows用アプリイメージです。単一ファイルではなく、生成された `JavaBronzeStudy` フォルダを丸ごと配布してください。インストーラー形式（msi/exe）にする場合はWindows Installer Toolset（WiX）が別途必要です。

## API

- `GET /api/health`: ヘルスチェック
- `GET /api/categories`: CSV由来のカテゴリー一覧
- `GET /api/questions/random`: CSVの140問からランダム60問

## 元のViteテンプレート情報

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
