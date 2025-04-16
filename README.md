# LensLog

LensLogは、指定されたディレクトリ内の画像ファイル（JPG形式）のEXIFデータを解析し、CSVまたはTSV形式で出力するDenoスクリプトです。

## 特徴

- EXIFデータの取得（例: 撮影日時、カメラモデル、シャッタースピードなど）
- CSVまたはTSV形式でのデータ出力
- デバッグモードで詳細なログを表示

## 必要条件

- Deno 1.33.0以上
- `exiftool`がインストールされていること

## インストール

1. [Deno](https://deno.land/)をインストールします。
2. `exiftool`をインストールします（macOSの場合、`brew install exiftool`）。

## 使用方法

以下のコマンドでスクリプトを実行します：

```bash
# 基本的な使用例
$ deno run --allow-read --allow-run main.ts --dir=./images --format=csv

# デバッグモードを有効にする
$ deno run --allow-read --allow-run main.ts --dir=./images --format=csv --debug
```

### コマンドラインオプション

- `--dir`: 解析対象の画像ディレクトリを指定します（必須）。
- `--format`: 出力形式を指定します（`csv`または`tsv`、デフォルトは`csv`）。
- `--debug`: デバッグモードを有効にします（オプション）。

## 出力例

### CSV形式

```csv
Create Date,File Name,Camera Model Name,Shutter Speed Value,F Number,ISO,Lens Model
2025/04/16,a.jpg,Canon EOS,1/100,2.8,100,EF 24-70mm
```

### TSV形式

```tsv
Create Date\tFile Name\tCamera Model Name\tShutter Speed Value\tF Number\tISO\tLens Model
2025/04/16\ta.jpg\tCanon EOS\t1/100\t2.8\t100\tEF 24-70mm
```

## テスト

以下のコマンドでテストを実行できます：

```bash
$ deno test --allow-read
```

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。