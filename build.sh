#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}StatSVN ビルドプロセス開始${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${GREEN}[1/5]${NC} ディレクトリ構造を確認中..."
if [ ! -d "src" ] || [ ! -d "lib" ]; then
    echo "エラー: 必要なディレクトリが見つかりません"
    echo "  - src/"
    echo "  - lib/"
    exit 1
fi

# Require a source-controlled manifest template at `src/META-INF/MANIFEST.MF`.
if [ -f "src/META-INF/MANIFEST.MF" ]; then
    MANIFEST_SRC="src/META-INF/MANIFEST.MF"
else
    echo "エラー: マニフェストテンプレートが見つかりません"
    echo "  - src/META-INF/MANIFEST.MF (required)"
    exit 1
fi
echo "  ✓ ディレクトリ構造確認済み"

echo -e "${GREEN}[2/5]${NC} 既存のクラスファイルをクリア中..."
rm -rf build/classes/main
mkdir -p build/classes/main
echo "  ✓ クラスディレクトリをクリア"

echo -e "${GREEN}[3/5]${NC} Javaソースをコンパイル中..."
# Prepare filtered source directory (apply @VERSION@ replacements)
rm -rf src-temp
mkdir -p src-temp
# Copy project sources into temporary dir
cp -r src/* src-temp/ 2>/dev/null || true
# Read version directly from top-level VERSION file (assumed present and well-formed)
VERSION="$(head -n 1 VERSION | tr -d '[:space:]')"
echo "  - Using version: ${VERSION}"
echo "  - Replacing @VERSION@ with ${VERSION} in source files"
grep -RIl --exclude-dir=.git --exclude='*.png' --exclude='*.jar' "@VERSION@" src-temp 2>/dev/null | while read -r f; do
    sed -i "s/@VERSION@/${VERSION}/g" "$f" || true
done
# Compile project sources
SRC_FILES=$(find src-temp -name "*.java")
javac -encoding UTF-8 -d build/classes/main -cp "lib/*" $SRC_FILES
echo "  ✓ コンパイル完了"

echo -e "${GREEN}[4/5]${NC} リソースファイルをコピー中..."
cp src/net/sf/statsvn/*.properties build/classes/main/net/sf/statsvn/ 2>/dev/null || true
# Copy StatCVS-related resources (assume `src/net/sf/statcvs` exists)
find src/net/sf/statcvs -name "*.properties" -exec sh -c 'cp "$1" build/classes/main/net/sf/statcvs/ 2>/dev/null || true' _ {} \;
mkdir -p build/classes/main/net/sf/statcvs/web-files
cp -r src/net/sf/statcvs/web-files/* build/classes/main/net/sf/statcvs/web-files/ 2>/dev/null || true
mkdir -p build/classes/main/net/sf/statcvs/output/web-files
cp -r src/net/sf/statcvs/output/web-files/* build/classes/main/net/sf/statcvs/output/web-files/ 2>/dev/null || true
echo "  ✓ リソースファイルをコピー"

# Replace @VERSION@ in copied class resources (e.g. vendor web-files)
if [ -n "${VERSION}" ]; then
    echo "  - Replacing @VERSION@ in copied resources under build/classes"
    grep -RIl --exclude-dir=.git --exclude='*.png' --exclude='*.jar' "@VERSION@" build/classes/main 2>/dev/null | while read -r f; do
        sed -i "s/@VERSION@/${VERSION}/g" "$f" || true
    done
fi

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
# Ensure build/manifest.mf exists for jar cfm (copy from source template if provided)
if [ -f "src/META-INF/MANIFEST.MF" ]; then
    mkdir -p build
    cp src/META-INF/MANIFEST.MF build/manifest.mf
fi
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
