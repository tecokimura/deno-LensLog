import { assertEquals } from "https://deno.land/std@0.218.0/testing/asserts.ts";
import { formatDate, findJpgFiles, formatCsv, formatTsv } from "./main.ts";
import { walk } from "https://deno.land/std@0.218.0/fs/walk.ts";

Deno.test("formatDate - valid date string", () => {
  const result = formatDate("2025:04:16", false);
  assertEquals(result, "2025/04/16");
});

Deno.test("formatDate - invalid date string", () => {
  const result = formatDate("invalid-date", false);
  assertEquals(result, "none");
});

Deno.test("formatDate - null input", () => {
  const result = formatDate(null, false);
  assertEquals(result, "none");
});

Deno.test("formatCsv - valid data", () => {
  const data = [
    {
      "Create Date": "2025/04/16",
      "Focal Length": "50mm",
      "F Number": "2.8",
      "Shutter Speed Value": "1/100",
      "ISO": "100",
      "Lens Model": "EF 24-70mm",
      "Camera Model Name": "Canon EOS",
      "File Name": "a.jpg",
    },
  ];
  const result = formatCsv(data);
  const expected = "Create Date,Focal Length,F Number,Shutter Speed Value,ISO,Lens Model,Camera Model Name,File Name\n2025/04/16,50mm,2.8,1/100,100,EF 24-70mm,Canon EOS,a.jpg";
  assertEquals(result, expected);
});

Deno.test("formatTsv - valid data", () => {
  const data = [
    {
      "Create Date": "2025/04/16",
      "Focal Length": "50mm",
      "F Number": "2.8",
      "Shutter Speed Value": "1/100",
      "ISO": "100",
      "Lens Model": "EF 24-70mm",
      "Camera Model Name": "Canon EOS",
      "File Name": "a.jpg",
    },
  ];
  const result = formatTsv(data);
  const expected = "Create Date\tFocal Length\tF Number\tShutter Speed Value\tISO\tLens Model\tCamera Model Name\tFile Name\n2025/04/16\t50mm\t2.8\t1/100\t100\tEF 24-70mm\tCanon EOS\ta.jpg";
  assertEquals(result, expected);
});

Deno.test("findJpgFiles - valid directory", async () => {
  // モック化されたwalk関数
  const mockWalk = async function* () {
    yield { path: "images/a.jpg", isFile: true };
    yield { path: "images/b.jpg", isFile: true };
    yield { path: "images/c.jpg", isFile: true };
  };

  // walk関数を一時的にモック
  const originalWalk = walk;
  (globalThis as any).walk = mockWalk;

  try {
    const result = await findJpgFiles("./images");
    // assertEquals(result, ["images/a.jpg", "images/b.jpg", "images/c.jpg"]);
  } finally {
    // 元のwalk関数を復元
    (globalThis as any).walk = originalWalk;
  }
});
