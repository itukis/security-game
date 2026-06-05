# スライド書き出し手順

`docs/presentation.md` はMarp形式のMarkdownです。PPTXやPDFに変換する場合は、Marp CLIまたはVS CodeのMarp拡張を使います。

## 前提

このプロジェクトにはMarp CLIをnpm依存として追加していません。プロジェクトの `package.json` を変えずに試す場合は、`npx` で一時実行するか、ローカル環境にMarp CLIをグローバルインストールしてください。

## PDFへ変換

```bash
npx @marp-team/marp-cli docs/presentation.md --pdf --allow-local-files -o docs/presentation.pdf
```

## PPTXへ変換

```bash
npx @marp-team/marp-cli docs/presentation.md --pptx --allow-local-files -o docs/presentation.pptx
```

環境によってPPTX変換が失敗する場合は、まずPDFで書き出してください。

## HTMLへ変換

```bash
npx @marp-team/marp-cli docs/presentation.md --html --allow-local-files -o docs/presentation.html
```

## 画像を差し込む手順

1. `docs/images/` ディレクトリを作る
2. スクリーンショットを `docs/images/top-page.png` のような名前で置く
3. `docs/presentation.md` のコメント位置に画像を追加する

例:

```md
<!-- screenshot: トップページ -->

![bg right:45%](images/top-page.png)
```

通常の画像として入れる場合:

```md
![w:900](images/challenge-detail.png)
```

## スクリーンショット候補

- トップページ
- 問題一覧
- 詳細ページの進行ステップ
- 攻撃テスト結果
- 原因コード確認
- 修正案選択
- 防御成功の再テスト結果
- 防御失敗の再テスト結果

## VS Codeで確認する場合

VS CodeにMarp拡張が入っている場合は、`docs/presentation.md` を開いてプレビューできます。

書き出しはコマンドパレットから次を実行します。

```txt
Marp: Export Slide Deck
```

