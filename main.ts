import { parse } from "https://deno.land/std@0.218.0/flags/mod.ts";
import { join, resolve } from "https://deno.land/std@0.218.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.218.0/fs/walk.ts";

/**
 * DateオブジェクトをYYYY/MM/DD 形式の文字列にフォーマットします。
 * @param dateString Dateオブジェクトまたは日付文字列
 * @returns フォーマットされた日付文字列、または "none"
 */
function formatDate(dateString: string | null | undefined): string | "none" {
  if (!dateString) {
    return "none";
  }
  try {
    // 日付部分のコロンをハイフンに置換
    const normalizedDateString = dateString.replace(/(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const date = new Date(normalizedDateString);
    console.log("Normalized Date String:", normalizedDateString); // デバッグ出力
    console.log("Date object:", date); // デバッグ出力
    console.log("Year:", date.getFullYear()); // デバッグ出力
    console.log("Month:", date.getMonth()); // デバッグ出力
    console.log("Day:", date.getDate()); // デバッグ出力
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return "none";
  }
}

/**
 * exiftool を実行して、指定されたファイルのEXIFデータをJSON形式で取得します。
 * @param filePath 対象のファイルパス
 * @param fields 取得するEXIFフィールド名（exiftoolのJSON出力キー名）の配列
 * @returns EXIFデータを格納したRecordオブジェクト。取得できなかった場合は "none" が設定されます。
 */
async function getExifData(
  filePath: string,
  fields: string[],
): Promise<Record<string, string>> {
  try {
    const process = new Deno.Command("exiftool", {
      args: ["-j", ...fields.map((field) => `-${field}`), filePath], // -n: 数値タグIDの代わりに値を表示, -j: JSON形式で出力
      stdout: "piped", // 標準出力をパイプに接続
      stderr: "piped", // 標準エラー出力をパイプに接続
    });
    const output = await process.output();

    if (!output.success) {
      const errorString = new TextDecoder().decode(output.stderr);
      console.error(`exiftool error for ${filePath}: ${errorString}`);
      return Object.fromEntries(
        Object.keys(fields).map((key) => [fields[key], "none"]),
      ); // エラー発生時は全てのフィールドを "none" で返す
    }

    const stdout = new TextDecoder().decode(output.stdout).trim();
    // 5. exiftool の出力（JSON形式）をコンソールに出力して、CreateDate の形式を確認します。
    // console.log("exiftool JSON output:", stdout);
    const jsonData = JSON.parse(stdout); // JSON形式の出力を解析
    if (jsonData.length > 0) {
      const exifData: Record<string, string> = {};
      // 取得したいフィールド名（人間が読みやすい形式）をキーとして、JSONデータから値を取得し、必要に応じてフォーマット
      // 6. jsonData[0]["DateTimeOriginal"] および jsonData[0]["CreateDate"] の値がどのような形式で入っているか確認します。
      const createDateRaw = jsonData[0]["CreateDate"] !== undefined
        ? jsonData[0]["CreateDate"]
        : "none";
      // 7. formatDate 関数に渡される前の createDateRaw の値をコンソールに出力して確認します。
      // console.log("Raw Create Date:", createDateRaw);
      exifData["Create Date"] = formatDate(createDateRaw);
      exifData["File Name"] = jsonData[0]["FileName"] !== undefined
        ? String(jsonData[0]["FileName"])
        : "none";
      exifData["Camera Model Name"] = jsonData[0]["Model"] !== undefined
        ? String(jsonData[0]["Model"])
        : "none";
      exifData["Shutter Speed Value"] = jsonData[0]["ShutterSpeedValue"] !== undefined
        ? String(jsonData[0]["ShutterSpeedValue"])
        : "none";
      exifData["F Number"] = jsonData[0]["FNumber"] !== undefined
        ? String(jsonData[0]["FNumber"])
        : "none";
      exifData["ISO"] = jsonData[0]["ISO"] !== undefined
        ? String(jsonData[0]["ISO"])
        : "none";
      exifData["Lens Model"] = jsonData[0]["LensModel"] !== undefined
        ? String(jsonData[0]["LensModel"])
        : "none";
      return exifData;
    } else {
      return Object.fromEntries(
        Object.keys(fields).map((key) => [fields[key], "none"]),
      );
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error}`);
    return Object.fromEntries(
      Object.keys(fields).map((key) => [fields[key], "none"]),
    );
  }
}

/**
 * 指定されたディレクトリ内のすべてのJPGファイルのパスを非同期で検索します。
 * @param dirPath 検索するディレクトリのパス
 * @returns JPGファイルのパスの配列
 */
async function findJpgFiles(dirPath: string): Promise<string[]> {
  const jpgFiles: string[] = [];
  try {
    for await (const entry of walk(dirPath, { exts: [".jpg"] })) {
      if (entry.isFile) {
        jpgFiles.push(entry.path);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}: ${error}`);
  }
  return jpgFiles;
}

/**
 * 取得したEXIFデータをCSV形式の文字列に整形します。
 * @param data EXIFデータの配列
 * @returns CSV形式の文字列
 */
function formatCsv(data: Record<string, string>[]): string {
  if (data.length === 0) {
    return "";
  }
  const header = ["Create Date", "File Name", "Camera Model Name", "Shutter Speed Value", "F Number", "ISO", "Lens Model"].join(","); // ヘッダー行を作成
  const rows = data.map((item) => [item["Create Date"], item["File Name"], item["Camera Model Name"], item["Shutter Speed Value"], item["F Number"], item["ISO"], item["Lens Model"]].join(",")); // データ行を作成
  return `${header}\n${rows.join("\n")}`;
}

/**
 * 取得したEXIFデータをTSV形式の文字列に整形します。
 * @param data EXIFデータの配列
 * @returns TSV形式の文字列
 */
function formatTsv(data: Record<string, string>[]): string {
  if (data.length === 0) {
    return "";
  }
  const header = ["Create Date", "File Name", "Camera Model Name", "Shutter Speed Value", "F Number", "ISO", "Lens Model"].join("\t"); // ヘッダー行を作成
  const rows = data.map((item) => [item["Create Date"], item["File Name"], item["Camera Model Name"], item["Shutter Speed Value"], item["F Number"], item["ISO"], item["Lens Model"]].join("\t")); // データ行を作成
  return `${header}\n${rows.join("\n")}`;
}

/**
 * メイン処理関数
 */
async function main() {
  const args = parse(Deno.args, {
    string: ["format"], // --format オプションを文字列として解析
    default: { format: "csv" }, // デフォルトのフォーマットは CSV
  });

  const imageDirEnv = Deno.env.get("IMAGE_DIR"); // 環境変数 IMAGE_DIR を取得
  if (!imageDirEnv) {
    console.error("環境変数 IMAGE_DIR が設定されていません。");
    Deno.exit(1);
  }

  const imageDirPath = resolve(imageDirEnv); // 環境変数を絶対パスに解決
  const jpgFiles = await findJpgFiles(imageDirPath); // JPGファイルのリストを取得

  if (jpgFiles.length === 0) {
    console.log("指定されたディレクトリにJPGファイルが見つかりませんでした。");
    return;
  }

  // exiftool の JSON 出力におけるキー名
  const exifFieldsInJson = [
    "FileName",
    "Model",
    "ShutterSpeedValue",
    "FNumber",
    "ISO",
    "LensModel",
    "CreateDate",
  ];

  const allExifData: Record<string, string>[] = [];
  for (const jpgFile of jpgFiles) {
    const exifData = await getExifData(jpgFile, exifFieldsInJson); // 各JPGファイルからEXIFデータを取得
    allExifData.push(exifData);
  }

  // 指定されたフォーマットで出力
  if (args.format === "tsv") {
    console.log(formatTsv(allExifData));
  } else if (args.format === "csv") {
    console.log(formatCsv(allExifData));
  } else {
    console.error(`不明なフォーマット: ${args.format}. CSV形式で出力します。`);
    console.log(formatCsv(allExifData));
  }
}

// このモジュールが直接実行された場合に main 関数を呼び出す
if (import.meta.main) {
  await main();
}
