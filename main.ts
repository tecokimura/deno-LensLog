import { parse } from "https://deno.land/std@0.218.0/flags/mod.ts";
import { join, resolve } from "https://deno.land/std@0.218.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.218.0/fs/walk.ts";

/**
 * DateオブジェクトをYYYY/MM/DD 形式の文字列にフォーマットします。
 * @param dateString Dateオブジェクトまたは日付文字列
 * @param debug デバッグモードのフラグ
 * @returns フォーマットされた日付文字列、または "none"
 */
export function formatDate(dateString: string | null | undefined, debug: boolean): string | "none" {
  if (!dateString) {
    return "none";
  }
  try {
    const normalizedDateString = dateString.replace(/(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const date = new Date(normalizedDateString);
    if (isNaN(date.getTime())) {
      return "none"; // 無効な日付の場合は "none" を返す
    }
    if (debug) {
      console.log("Normalized Date String:", normalizedDateString);
      console.log("Date object:", date);
      console.log("Year:", date.getFullYear());
      console.log("Month:", date.getMonth());
      console.log("Day:", date.getDate());
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return "none";
  }
}

interface ExifData {
  FileName?: string;
  Model?: string;
  ShutterSpeedValue?: string;
  FNumber?: string;
  ISO?: string;
  LensModel?: string;
  CreateDate?: string;
}

/**
 * exiftool を実行して、指定されたファイルのEXIFデータをJSON形式で取得します。
 * @param filePath 対象のファイルパス
 * @param fields 取得するEXIFフィールド名（exiftoolのJSON出力キー名）の配列
 * @param debug デバッグモードのフラグ
 * @returns EXIFデータを格納したRecordオブジェクト。取得できなかった場合は "none" が設定されます。
 */
async function getExifData(
  filePath: string,
  fields: string[],
  debug: boolean
): Promise<Record<string, string>> {
  try {
    const process = new Deno.Command("exiftool", {
      args: ["-j", ...fields.map((field) => `-${field}`), filePath],
      stdout: "piped",
      stderr: "piped",
    });
    const output = await process.output();

    if (!output.success) {
      const errorString = new TextDecoder().decode(output.stderr);
      console.error(`exiftool error for ${filePath}: ${errorString}`);
      return Object.fromEntries(
        fields.map((field) => [field, "none"]),
      );
    }

    const stdout = new TextDecoder().decode(output.stdout).trim();
    const jsonData: ExifData[] = JSON.parse(stdout); // 型アサーションを追加

    if (jsonData.length > 0) {
      const exifData: Record<string, string> = {};
      const createDateRaw = jsonData[0].CreateDate ?? "none";
      exifData["Create Date"] = formatDate(createDateRaw, debug);
      exifData["File Name"] = jsonData[0].FileName ?? "none";
      exifData["Camera Model Name"] = jsonData[0].Model ?? "none";
      exifData["Shutter Speed Value"] = jsonData[0].ShutterSpeedValue ?? "none";
      exifData["F Number"] = jsonData[0].FNumber ?? "none";
      exifData["ISO"] = jsonData[0].ISO ?? "none";
      exifData["Lens Model"] = jsonData[0].LensModel ?? "none";
      return exifData;
    } else {
      return Object.fromEntries(
        fields.map((field) => [field, "none"]),
      );
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error}`);
    return Object.fromEntries(
      fields.map((field) => [field, "none"]),
    );
  }
}

/**
 * 指定されたディレクトリ内のすべてのJPGファイルのパスを非同期で検索します。
 * @param dirPath 検索するディレクトリのパス
 * @returns JPGファイルのパスの配列
 */
export async function findJpgFiles(dirPath: string): Promise<string[]> {
  const jpgFiles: string[] = [];
  try {
    for await (const entry of walk(dirPath, { exts: [".jpg"] })) {
      if (entry.isFile) {
        jpgFiles.push(`./${entry.path}`); // パスを "./" で始めるよう修正
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
export function formatCsv(data: Record<string, string>[]): string {
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
export function formatTsv(data: Record<string, string>[]): string {
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
    string: ["format", "dir"],
    boolean: ["debug"], // --debug オプションを追加
    default: { format: "csv", debug: false },
  });

  const debug = args.debug; // デバッグモードのフラグ

  const imageDirPath = args.dir ? resolve(args.dir) : null;
  if (!imageDirPath) {
    console.error("--dir オプションで画像ディレクトリを指定してください。");
    Deno.exit(1);
  }

  if (debug) console.log(`画像ディレクトリ: ${imageDirPath}`);

  const jpgFiles = await findJpgFiles(imageDirPath);

  if (jpgFiles.length === 0) {
    console.log("指定されたディレクトリにJPGファイルが見つかりませんでした。");
    return;
  }

  if (debug) console.log(`JPGファイル: ${jpgFiles}`);

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
    const exifData = await getExifData(jpgFile, exifFieldsInJson, debug);
    if (debug) console.log(`EXIFデータ (${jpgFile}):`, exifData);
    allExifData.push(exifData);
  }

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
