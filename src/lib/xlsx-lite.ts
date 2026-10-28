import { inflateRawSync } from "node:zlib";

/** Minimal xlsx reader for the first worksheet. Enough for the member import template. */

function readZipEntries(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.slice(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) break;
    const compressed = buf.slice(dataStart, dataEnd);
    let content: Buffer;
    if (method === 0) content = compressed;
    else if (method === 8) content = inflateRawSync(compressed);
    else throw new Error(`不支持的 xlsx 压缩方式（${name}）`);
    out.set(name, content);
    offset = dataEnd;
  }
  if (!out.size) throw new Error("文件不是有效的 xlsx");
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const si = xml.match(/<si[\s>][\s\S]*?<\/si>/g) || [];
  for (const block of si) {
    const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
    out.push(texts.join(""));
  }
  return out;
}

function colIndex(cellRef: string): number {
  const letters = (cellRef.match(/^[A-Z]+/) || ["A"])[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function rowIndex(cellRef: string): number {
  return Number((cellRef.match(/(\d+)$/) || ["", "1"])[1]) - 1;
}

export function xlsxFirstSheet(buf: Buffer): string[][] {
  const files = readZipEntries(buf);
  const sheetName =
    [...files.keys()].find((n) => n === "xl/worksheets/sheet1.xml") ||
    [...files.keys()].find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  if (!sheetName) throw new Error("xlsx 里没有工作表");
  const strings = files.has("xl/sharedStrings.xml") ? sharedStrings(files.get("xl/sharedStrings.xml")!.toString("utf8")) : [];
  const xml = files.get(sheetName)!.toString("utf8");
  const cells = [...xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)];
  const grid = new Map<number, Map<number, string>>();
  let maxR = 0;
  let maxC = 0;
  for (const cell of cells) {
    const attrs = cell[1];
    const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
    if (!ref) continue;
    const r = rowIndex(ref);
    const c = colIndex(ref);
    const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "";
    const body = cell[2];
    let value = "";
    if (type === "inlineStr") {
      value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
    } else {
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (v != null) {
        if (type === "s") value = strings[Number(v)] ?? "";
        else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
        else value = decodeXml(v);
      }
    }
    if (!grid.has(r)) grid.set(r, new Map());
    grid.get(r)!.set(c, value);
    maxR = Math.max(maxR, r);
    maxC = Math.max(maxC, c);
  }
  const table: string[][] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) row.push(grid.get(r)?.get(c) ?? "");
    if (row.some((x) => String(x).trim() !== "")) table.push(row);
  }
  return table;
}
