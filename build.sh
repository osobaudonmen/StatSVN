#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}StatSVN ビルドプロセス開始${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "${GREEN}[1/5]${NC} ディレクトリ構造を確認中..."
if [ ! -d "src" ] || [ ! -d "lib" ] || [ ! -f "build/manifest.mf" ]; then
    echo "エラー: 必要なディレクトリまたはファイルが見つかりません"
    echo "  - src/"
    echo "  - lib/"
    echo "  - build/manifest.mf"
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
# Note: vendor Java sources are compiled separately to avoid duplicate-class errors
VERSION=""
# 1) Prefer an explicit top-level VERSION file (single line, e.g. "1.2.3")
if [ -f "VERSION" ]; then
    # read first non-empty non-comment line
    VLINE="$(sed -n '/^[[:space:]]*[^#[:space:]]/p' VERSION | sed -n '1p' | tr -d '[:space:]')" || true
    if [ -n "${VLINE}" ]; then
        VERSION="${VLINE}"
        echo "  - Using version from VERSION file: ${VERSION}"
    fi
fi

# 2) Allow environment override
if [ -z "${VERSION}" ] && [ -n "${STATSVN_VERSION}" ]; then
    VERSION="${STATSVN_VERSION}"
    echo "  - Using version from STATSVN_VERSION environment variable: ${VERSION}"
fi

# No fallbacks: require VERSION file or STATSVN_VERSION env var
if [ -z "${VERSION}" ]; then
    echo "Error: No version specified. Create a top-level 'VERSION' file or set STATSVN_VERSION environment variable."
    exit 1
fi
if [ -n "${VERSION}" ]; then
    echo "  - Replacing @VERSION@ with ${VERSION} in source files"
    grep -RIl --exclude-dir=.git --exclude='*.png' --exclude='*.jar' "@VERSION@" src-temp 2>/dev/null | while read -r f; do
        sed -i "s/@VERSION@/${VERSION}/g" "$f" || true
    done
fi
# Compile project sources and vendor sources (vendor compiled from its src tree)
javac -encoding UTF-8 -d build/classes/main -cp "lib/*" $(find src-temp vendor/statcvs-0.7.0/src -name "*.java")
echo "  ✓ コンパイル完了"

echo -e "${GREEN}[4/5]${NC} リソースファイルをコピー中..."
cp src/net/sf/statsvn/*.properties build/classes/main/net/sf/statsvn/ 2>/dev/null || true
if [ -d "vendor/statcvs-0.7.0/src/net/sf/statcvs" ]; then
    find vendor/statcvs-0.7.0/src/net/sf/statcvs -name "*.properties" -exec sh -c 'cp "$1" build/classes/main/net/sf/statcvs/ 2>/dev/null || true' _ {} \;
    # ウェブファイル（CSS等）をコピー
    if [ -d "vendor/statcvs-0.7.0/src/net/sf/statcvs/web-files" ]; then
        mkdir -p build/classes/main/net/sf/statcvs/web-files
        cp vendor/statcvs-0.7.0/src/net/sf/statcvs/web-files/* build/classes/main/net/sf/statcvs/web-files/ 2>/dev/null || true
    fi
    # include output/site web-files if present
    if [ -d "vendor/statcvs-0.7.0/src/net/sf/statcvs/output/web-files" ]; then
        mkdir -p build/classes/main/net/sf/statcvs/output/web-files
        cp vendor/statcvs-0.7.0/src/net/sf/statcvs/output/web-files/* build/classes/main/net/sf/statcvs/output/web-files/ 2>/dev/null || true
    fi
    if [ -d "vendor/statcvs-0.7.0/site/web-files" ]; then
        mkdir -p build/classes/main/net/sf/statcvs/web-files
        cp vendor/statcvs-0.7.0/site/web-files/* build/classes/main/net/sf/statcvs/web-files/ 2>/dev/null || true
    fi
fi
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
