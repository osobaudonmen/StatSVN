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
- 重要な変更・前提・制約は必ず明記する。
- 実行前に大きな変更を行う場合は簡単なプランを提示してユーザーの承認を得る。

## ファイル編集ルール

- 不要なフォーマット変更や大量の改行/インデント修正は避ける。
- 変更箇所には不要なコメントを追加しない（説明は差分の説明やコミットメッセージに記載）。

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
# 1. コンパイル
javac -d build/classes/main -cp "lib/*" $(find src -name "*.java")

# 2. リソースファイルをコピー
cp src/net/sf/statsvn/*.properties build/classes/main/net/sf/statsvn/

# 3. Fat JAR を作成
cd build/tmp_fatjar
for jar in ../../lib/*.jar; do jar xf "$jar"; done
cd - > /dev/null
cp -r build/classes/main/net build/tmp_fatjar/
jar cfm build/dist/statsvn.jar build/manifest.mf -C build/tmp_fatjar .
```

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
  -disable-twitter-button \
  -viewvc http://localhost/viewvc/ \
  -mantis http://localhost/mantis/ \
  -username user123 \
  -password password123
```

**オプション確認:**

```bash
java -jar build/dist/statsvn.jar
```

## テストと検証

- 変更後はまずコンパイルを確認する（`javac`）。可能なら実行して `Main` の Usage 出力などを確認する。
- 既存のユニットテスト（存在する場合）は実行する。

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

## コミット / PR の方針（人間ユーザー向け）

- 変更単位は小さく、1つの目的に絞る。
- コミットメッセージは「何を」「なぜ」行ったかが分かる短い説明にする（英語推奨だが日本語でも可）。
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

## 追加のヒント（ユーザーへのガイド）

- 期待する挙動や優先順位がある場合はタスクごとに明記してください（例：「まずビルド、次に実行確認、最後に小さなバグ修正」）。
- 変更のスコープを狭く指定すると、より確実で安全な修正が得られます。