# StatSVN Fork

このリポジトリは、[StatSVN](https://github.com/AusHick/StatSVN) のフォーク版です。

- バグ修正・調整
  - パスに%を含むファイルでエラーになるバグを修正
  - グラフの日付書式の調整
- Repo Heatmapのアプレットの廃止（簡易的なJavascript実装で置き換え）
- 要らない機能の削除
  - Twitter Button
- 開発にGithub Copilotを使用しています

## プロジェクト構成

このプロジェクトは以下のコンポーネントで構成されています：

### StatSVN
- SVNリポジトリの統計情報を生成するツール
- メインアプリケーション（`src/net/sf/statsvn/`）

### StatCVS
- StatSVNのベースとなるCVS統計ツール
- ソースコード: `src/net/sf/statcvs/`
- プロジェクト: [StatCVS - SourceForge](https://sourceforge.net/projects/statcvs/)
- StatCVS 0.7.0 のソースを含めており、ビルド時に StatSVN と一緒にコンパイルされます

---

以下、オリジナルのREADME.mdを掲載しています。

---

StatSVN
------------
StatSVN is a statistics tool for SVN repositories. It generates HTML reports from SVN log files.

#### The StatSVN Manual
The StatSVN manual is located here: http://svn.statsvn.org/statsvnwiki/index.php/UserManual

#### Quick Start
1. Download the latest release from [here](https://github.com/Revenge282/StatSVN/releases/latest "here").
2. Expand the zip file into some directory, e.g C:\statsvn
3. Check out a working copy of the desired SVN module into some directory, e.g. C:\myproject.
4. Change into that directory and type `svn log --xml -v > svn.log`
5. Change back to the c:\statsvn directory
6. Type `java -jar statsvn.jar C:\myproject\svn.log C:\myproject`
7. Open C:\statsvn\index.html in your web browser

You can tweak the output of StatSVN in various ways. Run `java -jar statsvn.jar` for an overview of the command line parameters, and check the manual for full information.