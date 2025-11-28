#!/bin/bash

# StatSVN ビルドスクリプト
# 用途: ソースコードをコンパイルして、スタンドアロンで実行可能なJARファイルを生成する

set -e

# 色付き出力用
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}StatSVN ビルドプロセス開始${NC}"
echo -e "${BLUE}========================================${NC}"

# ディレクトリ構造を確認
echo -e "${GREEN}[1/5]${NC} ディレクトリ構造を確認中..."
if [ ! -d "src" ] || [ ! -d "lib" ] || [ ! -f "build/manifest.mf" ]; then
    echo "エラー: 必要なディレクトリまたはファイルが見つかりません"
    echo "  - src/"
    echo "  - lib/"
    echo "  - build/manifest.mf"
    exit 1
fi
echo "  ✓ ディレクトリ構造確認済み"

# クラスファイルをクリア
echo -e "${GREEN}[2/5]${NC} 既存のクラスファイルをクリア中..."
rm -rf build/classes/main
mkdir -p build/classes/main
echo "  ✓ クラスディレクトリをクリア"

# Javaソースをコンパイル
echo -e "${GREEN}[3/5]${NC} Javaソースをコンパイル中..."
javac -d build/classes/main -cp "lib/*" $(find src -name "*.java")
echo "  ✓ コンパイル完了"

# プロパティファイルをコピー
echo -e "${GREEN}[4/5]${NC} リソースファイルをコピー中..."
cp src/net/sf/statsvn/*.properties build/classes/main/net/sf/statsvn/
echo "  ✓ リソースファイルをコピー"

# Fat JAR を作成
echo -e "${GREEN}[5/5]${NC} Fat JARを作成中..."
rm -rf build/tmp_fatjar
mkdir -p build/tmp_fatjar

# 依存ライブラリを展開
cd build/tmp_fatjar
for jar in ../../lib/*.jar; do
    jar xf "$jar"
done
cd - > /dev/null

# コンパイル済みクラスをコピー
cp -r build/classes/main/net build/tmp_fatjar/

# JARファイルを作成
rm -f build/dist/statsvn.jar
mkdir -p build/dist
jar cfm build/dist/statsvn.jar build/manifest.mf -C build/tmp_fatjar .

echo "  ✓ Fat JARを作成"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ ビルド完了！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "生成されたファイル:"
ls -lh build/dist/statsvn.jar
echo ""
echo "実行方法:"
echo "  java -jar build/dist/statsvn.jar [options] <logfile> <directory>"
echo ""
echo "使用例:"
echo "  java -jar build/dist/statsvn.jar svn.log /path/to/project -output-dir output"
echo ""
echo "詳細なオプションを表示:"
echo "  java -jar build/dist/statsvn.jar"
echo ""
