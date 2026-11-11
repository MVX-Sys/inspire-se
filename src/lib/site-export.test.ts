import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { requireExportAdmin, toCsv, safeStoragePath, EXPORT_TABLES } from "./site-export";
import { EXPORT_COLUMNS } from "./site-export-columns";

describe("site export", () => {
  test("only administrators may export private site data", () => {
    assert.throws(() => requireExportAdmin(false));
    assert.throws(() => requireExportAdmin("admin"));
    assert.doesNotThrow(() => requireExportAdmin(true));
  });
  test("CSV preserves prices, nulls, JSON, arrays and escaped multiline values", () => {
    assert.equal(toCsv([{ preco: 50, n: null, vazio: "", detalhes: { quantidade: 20 }, ids: ["a", "b"], nome: 'A,"B"\nC' }], ["preco", "n", "vazio", "detalhes", "ids", "nome"], ["ids"]),
      '"preco","n","vazio","detalhes","ids","nome"\r\n"50",,"","{""quantidade"":20}","{""a"",""b""}","A,""B""\nC"\r\n');
  });
  test("every site table has an export header even when empty", () => {
    assert.equal(EXPORT_TABLES.length, 18);
    for (const table of EXPORT_TABLES) assert.ok(EXPORT_COLUMNS[table].length > 0);
    assert.equal(toCsv([], ["id", "nome"]), '"id","nome"\r\n');
  });
  test("media paths preserve folders without archive traversal", () => {
    assert.equal(safeStoragePath("gc-import/foto.webp"), true);
    assert.equal(safeStoragePath("../foto.jpg"), false);
    assert.equal(safeStoragePath("a/../../foto.jpg"), false);
  });
});