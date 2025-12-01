# GitHub Copilot 指示書（日本語）

## 目的

- この文書は、GitHub Copilot（あるいはリポジトリ内で動作する対話型アシスタント）に対する明確な指示セットをまとめたものです。リポジトリ固有の期待動作、コーディング規約、ファイル編集ルール、テスト・ビルド手順などを記載します。

## 使用範囲
- Javaベースの `StatSVN` プロジェクトに対する変更・ビルド・デバッグ・簡単なリファクタリングを想定します。

## 基本的な役割（Copilotへ期待すること）

- 与えられたタスクを最小限の影響で正確に実行する。
- ソースの修正は「問題の根本原因を修正」することを優先し、不必要に大きな変更は避ける。
- 変更は一貫したスタイルで行い、既存のコードの命名規則やインデントを尊重する。
- 変更を行ったら、可能な場合はローカルでコンパイル／テストを実行して成功を確認する（利用可能な環境の範囲で）。

## コミュニケーションスタイル

- 日本語で解凍する。
- 簡潔で直接的、協調的な口調で回答する。
 - ユーザーが「ブラウザで開いて」と指示した場合は、**VSCode の内蔵ブラウザ（Simple Browser）で開くこと**を意味します。
- 重要な変更・前提・制約は必ず明記する。
- 実行前に大きな変更を行う場合は簡単なプランを提示してユーザーの承認を得る。

## ファイル編集ルール

- 不要なフォーマット変更や大量の改行/インデント修正は避ける。
- 変更箇所には不要なコメントを追加しない（説明は差分の説明やコミットメッセージに記載）。
 - ソースコード内に修正履歴（変更履歴）を残さないこと。修正履歴を記録する場合は必ず git のコミットメッセージに記載してください。
- ソースコードで処理や名称で自明なことにコメントはつけないでください。
- ソースコードにコメントを記載する場合は簡潔にしてください。
 - jsやcssなどのリソースファイルを変更する場合は `src/**/web-files/` の下のファイルを書き換えてください。

## ビルドと実行

### ビルド手順

このリポジトリはスタンドアロン実行可能なFat JAR（全依存ライブラリを含む）を生成します。

#### 推奨方法: ビルドスクリプト

```bash
./build.sh
```

このスクリプトは以下を自動実行します：
1. Javaソースコードをコンパイル（`javac`で`src/`を`build/classes/main/`にコンパイル）
2. 依存ライブラリを全て含めたFat JARを生成
3. `build/dist/statsvn.jar`（約6.1MB）を作成

#### Makefile を使用する方法

```bash
make build    # ビルド実行
make clean    # クリーニング
make test     # テスト実行
make help     # ヘルプ表示
```

#### 手動でビルドする場合

```bash
# 1. コンパイル（StatCVS ソースを含める）
javac -encoding UTF-8 -d build/classes/main -cp "lib/*" $(find src vendor/statcvs-0.7.0/src -name "*.java")

# 2. リソースファイルをコピー
cp src/net/sf/statsvn/*.properties build/classes/main/net/sf/statsvn/
find vendor/statcvs-0.7.0/src/net/sf/statcvs -name "*.properties" -exec sh -c 'cp "$1" build/classes/main/net/sf/statcvs/ 2>/dev/null || true' _ {} \;

# 3. Fat JAR を作成
cd build/tmp_fatjar
for jar in ../../lib/*.jar; do jar xf "$jar"; done
cd - > /dev/null
cp -r build/classes/main/net build/tmp_fatjar/
jar cfm build/dist/statsvn.jar build/manifest.mf -C build/tmp_fatjar .
```

#### Java 17 対応ビルドルール

- **必須要件**: Java 17 以上がインストールされていること
- **コンパイルオプション**: Java 17 互換性を確保するため、以下のオプションを使用する：
  ```bash
  javac --release 17 -encoding UTF-8 -d build/classes/main -cp "lib/*" $(find src vendor/statcvs-0.7.0/src -name "*.java")
  ```
- **JAR マニフェスト**: `build/manifest.mf` に以下を記載して Java 17 での実行を保証する：
  ```
  Manifest-Version: 1.0
  Main-Class: net.sf.statsvn.Main
  Created-By: Java 17
  ```
- **実行時環境**: Java 17 以上で実行すること：
  ```bash
  java -jar build/dist/statsvn.jar [options]
  ```
- **検証方法**: コンパイル後、以下コマンドでコンパイル対象バージョンを確認すること：
  ```bash
  javap -verbose build/classes/main/net/sf/statsvn/Main.class | grep "major version"
  ```
  - Java 17 の場合: `major version: 61`

### 実行方法

ビルド後、以下のコマンドで実行します：

```bash
java -jar build/dist/statsvn.jar [options] <logfile> <directory>
```

**実行例（テスト環境）:**

```bash
LANG=ja_JP.UTF-8 java -jar build/dist/statsvn.jar testing/svn.log testing/project \
  -output-dir testing/output \
  -charset UTF-8 \
  -viewvc http://localhost/viewvc/ \
  -mantis http://localhost/mantis/ \
  -username user123 \
  -password password123
```

**オプション確認:**

```bash
java -jar build/dist/statsvn.jar
```

### 配布用（Fat JAR）確認と同梱方法

- **目的**: 生成物の JAR を単体で配布できるように、外部ライブラリや必要な外部ファイルをすべて同梱する。
- **前提**: `lib/` に外部依存 JAR、`vendor/` に外部ソースやリソースが存在すること。

- **含むリソース**: HTML/CSS/JS、画像、フォントなどの静的ウェブリソースや設定ファイルなど、配布に必要な外部ファイルも同梱対象です。

#### スクリプト/Makefile を使う場合

`./build.sh` や `make build` は基本的に依存を展開して `build/tmp_fatjar` に集約し、`build/dist/statsvn.jar` を作成します。ビルド後に以下で確認してください:

```bash
# JAR の中身と依存が含まれているか確認
jar tf build/dist/statsvn.jar | head -n 40

# 実行テスト
LANG=ja_JP.UTF-8 java -jar build/dist/statsvn.jar --help
```

#### 手動で同梱する場合（詳細）

1. 作業ディレクトリを用意します:

```bash
rm -rf build/tmp_fatjar
mkdir -p build/tmp_fatjar
```

2. 依存 JAR を展開して中身を集める:

```bash
for jar in lib/*.jar; do (cd build/tmp_fatjar && jar xf "../../$jar"); done
```

3. コンパイルしたクラスとリソースをコピーする:

```bash
cp -r build/classes/main/* build/tmp_fatjar/ || true
cp -r src/net/sf/statsvn/*.properties build/tmp_fatjar/net/sf/statsvn/ 2>/dev/null || true
# 必要なら vendor 内の追加リソースもコピー
cp -r vendor/statcvs-0.7.0/site/web-files/* build/tmp_fatjar/ 2>/dev/null || true
```

4. マニフェストを用意して JAR を作成する:

```bash
jar cfm build/dist/statsvn.jar build/manifest.mf -C build/tmp_fatjar .
```

5. 最終確認 — JAR にクラス/リソースが含まれているか、依存の主要クラスが存在するかを確認してください:

```bash
jar tf build/dist/statsvn.jar | grep -E "net/sf/statsvn|org/|com/|META-INF/|repomap" || true
LANG=ja_JP.UTF-8 java -jar build/dist/statsvn.jar --help
```

#### 注意点

- ネイティブライブラリや外部データファイル（例: 大きな静的データ）はJARに含めないほうがよい場合があります。その場合は配布方法とインストール手順を別途ドキュメント化してください。
- `jar` コマンドでクラス競合（同名のリソースやクラス）が発生する場合、優先順位の検討や一部ライブラリの除外が必要です。


## テストと検証

- 変更後はまずコンパイルを確認する（`javac`）。可能なら実行して `Main` の Usage 出力などを確認する。
- 既存のユニットテスト（存在する場合）は実行する。

### svn.log の生成方法

テスト用の `svn.log` はリポジトリの作業コピーまたはリポジトリ URL から XML 形式で出力します。一般的な手順:

- 作業コピーから生成する（既に `testing/project/` がチェックアウト済みの場合）:

```bash
LANG=ja_JP.UTF-8 svn log --xml -v testing/project > testing/svn.log
```

- リポジトリ URL から直接取得する（作業コピーがない場合）:

```bash
LANG=ja_JP.UTF-8 svn log --xml -v svn://localhost/repo/trunk > testing/svn.log
```


### JavaScriptの動作確認

HTMLレポート内に含まれるJavaScriptのデバッグや動作確認は、以下の手順で行うこと：

1. **ビルドとテスト実行**
   ```bash
   make build
   LANG=ja_JP.UTF-8 java -jar build/dist/statsvn.jar testing/svn.log testing/project \
     -output-dir testing/output -charset UTF-8
   ```

   **注意（出力ディレクトリのクリーン）**: テストでレポートを生成する際、`-output-dir` で指定した出力先が既に存在する場合は、上書きによる混乱を避けるため生成前にクリーンしてください。例:

   ```bash
   # 出力先が存在する場合は中身を削除してから実行
   rm -rf testing/output && mkdir -p testing/output
   LANG=ja_JP.UTF-8 java -jar build/dist/statsvn.jar testing/svn.log testing/project \
     -output-dir testing/output -charset UTF-8
   ```

2. **ブラウザで直接開く（file://）**
  - 出力ディレクトリに移動して、生成された `repomap.html` をファイルで開きます。VSCode の内蔵ブラウザ（Simple Browser）で開くか、システムのブラウザで `file://` URL を使ってください。例:
    ```bash
    # VSCode の Simple Browser を使うか、単にファイルを開く
    # 例: file:///home/yuichi/working/StatSVN/testing/output/repomap.html
    ```
  - 必要に応じて、HTTP サーバを使った確認も引き続き可能です（オプション）。

  **監視（重要）**: ブラウザで動作確認する際は、以下を必ず確認してください。
  - ブラウザのデベロッパーツール（F12）を開き、**Console**タブで JavaScript エラーが発生していないか確認する。
  - **Network** タブで `repomap-data.js` や `repomap.js` / `repomap.css` の取得が成功しているか（file://の場合はリソースが読み込まれているか）確認する。
  - エラーが発生したら、まずコンソールのスタックトレースと Network のレスポンス内容を保存して共有してください。

3. **ブラウザのデベロッパーツール**
  - ブラウザのコンソール（F12キー）で JavaScript エラーを確認
  - Network タブでリソース読み込み（`repomap.js` / `repomap-data.js` 等）の成功/失敗を確認

### テスト環境

- テストは `testing/` ディレクトリ内で実行すること。
- テストに使用するSVNレポジトリは`svn://localhost/repo/trunk`とする。アカウントは`user123`、パスワードは`password123`とする。
- テストのレポジトリは`testing/project/`にチェックアウトされているものとする。
- テストのレポジトリのSVN Logは`testing/svn.log`に保存されているものとする。
- テストの出力ディレクトリは`testing/output/`とする。
- テストのcharsetは`UTF-8`とする。
- テストのViewVC URLは`http://localhost/viewvc/`とする。
- テストのMantis URLは`http://localhost/mantis/`とする。
- テスト時に使用するjarファイルは`build/dist/statsvn.jar`とする。
- テスト時に指定する環境変数`LANG`は`ja_JP.UTF-8`とする。

## コミット / PR の方針

- 変更単位は小さく、1つの目的に絞る。
- コミットメッセージは英語で記述し、`何を` と `なぜ` を簡潔に含めた短い説明にしてください。
- 大きな変更や設計変更は事前に議論を促す。

## よくある命令のテンプレ（例）

- 「ビルドしてください」
  - 期待される動作: `./build.sh` を実行するか、`make build` でビルドしてJARを生成。実行確認まで行い、出力と起きたエラーを報告する。
- 「テストしてください」
  - 期待される動作: `make test` で自動テストを実行。またはビルド後に手動で `java -jar build/dist/statsvn.jar testing/svn.log testing/project ...` で実行確認する。
- 「このクラスをリファクタして下さい」
  - 期待される動作: 小さな、安全な変更に限定してリファクタリングし、`./build.sh` でコンパイル/テストを通す。

## 安全性・機密情報について

- リポジトリに機密情報（パスワード、トークン）を追加しない。
- 実行ログに機密情報が含まれる可能性がある場合は、その旨を報告してマスキング方法を提案する。

## 制約事項（必ず守ること）

- リポジトリ外のネットワークアクセスやサードパーティのコードを勝手に追加しない（ユーザ承認が必要）。
- ビルドやテストで環境特有のコマンドを使う場合、前提（例: Javaバージョン）を明示する。
- ユーザーが明示的に指示しない限り `git push` を実行しないこと。

## 追加のヒント（ユーザーへのガイド）

- 期待する挙動や優先順位がある場合はタスクごとに明記してください（例：「まずビルド、次に実行確認、最後に小さなバグ修正」）。
- 変更のスコープを狭く指定すると、より確実で安全な修正が得られます。