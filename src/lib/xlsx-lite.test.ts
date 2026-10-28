import assert from "node:assert/strict";
import { test } from "node:test";
import { xlsxFirstSheet } from "./xlsx-lite";
import { tableToRecords } from "./member-import";
import { planImportRow } from "./member-import";

function zipStore(files: Array<[string, string]>): Buffer {
  const chunks: Buffer[] = [];
  for (const [name, content] of files) {
    const nameBuf = Buffer.from(name);
    const data = Buffer.from(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, data);
  }
  return Buffer.concat(chunks);
}

test("xlsx first sheet becomes import rows, including a numeric phone", () => {
  const sst = `<?xml version="1.0"?><sst><si><t>姓名</t></si><si><t>手机号</t></si><si><t>备注</t></si></sst>`;
  const sheet = `<?xml version="1.0"?><worksheet><sheetData>
    <row><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
    <row><c r="A2" t="inlineStr"><is><t>王小华</t></is></c><c r="B2"><v>13800000001</v></c><c r="C2" t="inlineStr"><is><t>820天</t></is></c></row>
  </sheetData></worksheet>`;
  const buf = zipStore([
    ["xl/sharedStrings.xml", sst],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);
  const records = tableToRecords(xlsxFirstSheet(buf));
  assert.equal(records.length, 1);
  const planned = planImportRow(records[0], 1, new Date("2026-10-28T07:00:00Z"));
  assert.equal(planned.ok, true);
  assert.equal(planned.name, "王小华");
  assert.equal(planned.phone, "13800000001");
  assert.equal(planned.joinedLabel, "820天");
});
