import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, toKanjiNumber } from "../scripts/formatters.mjs";

test("calendar numbers use compact twenty 廿 and thirty 丗", () => {
  const expected = new Map([
    [1,"一"],[9,"九"],[10,"十"],[11,"十一"],[19,"十九"],
    [20,"廿"],[21,"廿一"],[22,"廿二"],[29,"廿九"],
    [30,"丗"],[31,"丗一"],
  ]);
  for (const [day, expectedText] of expected) {
    assert.equal(toKanjiNumber(day), expectedText, String(day));
  }
});

test("calendar date preserves 廿/丗 in both modern and old character style", () => {
  for (const day of [20,21,29,30,31]) {
    const date = new Date(2026, 9, day, 12);
    for (const characterStyle of ["new","old"]) {
      const value = formatDate(date, {yearSystem:"wareki",characterStyle}, (text) => text);
      assert.match(value.line2Html, new RegExp(toKanjiNumber(day)+"日"));
      assert.doesNotMatch(value.line2Html, /二十|三十/);
    }
  }
});
