.PHONY: build clean test help

# デフォルトターゲット
help:
	@echo "StatSVN ビルドシステム"
	@echo ""
	@echo "利用可能なターゲット:"
	@echo "  make build       - ソースコードをコンパイルしてJARを生成"
	@echo "  make clean       - ビルド成果物を削除"
	@echo "  make test        - テストデータを使用してJARを実行"
	@echo "  make help        - このヘルプを表示"

# ビルド
build:
	@./build.sh

# クリーン
clean:
	@echo "クリーニング中..."
	@rm -rf build/classes/main
	@rm -rf build/tmp_fatjar
	@rm -f build/dist/statsvn.jar
	@echo "✓ クリーニング完了"

# テスト実行
test: build
	@echo ""
	@echo "テスト実行中..."
	@LANG=ja_JP.UTF-8 java -jar build/dist/statsvn.jar testing/svn.log testing/project \
		-output-dir testing/output \
		-charset UTF-8 \
		-disable-twitter-button \
		-viewvc http://localhost/viewvc/ \
		-mantis http://localhost/mantis/ \
		-username user123 \
		-password password123
	@echo ""
	@echo "✓ テスト完了: testing/output/"
	@ls -lh testing/output/ | head -10
