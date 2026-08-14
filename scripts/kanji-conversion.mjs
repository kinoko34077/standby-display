const KANJI_VARIANT_PAIRS = Object.freeze([
  ["亜", "亞"],
  ["仏", "佛"],
  ["会", "會"],
  ["体", "體"],
  ["価", "價"],
  ["円", "圓"],
  ["写", "寫"],
  ["効", "效"],
  ["国", "國"],
  ["図", "圖"],
  ["声", "聲"],
  ["変", "變"],
  ["学", "學"],
  ["実", "實"],
  ["対", "對"],
  ["帰", "歸"],
  ["広", "廣"],
  ["当", "當"],
  ["悪", "惡"],
  ["旧", "舊"],
  ["昼", "晝"],
  ["暁", "曉"],
  ["暦", "曆"],
  ["歴", "歷"],
  ["気", "氣"],
  ["沢", "澤"],
  ["浜", "濱"],
  ["滝", "瀧"],
  ["県", "縣"],
  ["画", "畫"],
  ["真", "眞"],
  ["辺", "邊"],
  ["鉄", "鐵"],
  ["読", "讀"],
  ["仮", "假"],
  ["寿", "壽"],
  ["与", "與"],
  ["蛍", "螢"],
  ["覚", "覺"],
  ["説", "說"],
  ["斉", "齊"],
  ["様", "樣"],
  ["亀", "龜"],
  ["台", "臺"],
]);

const NEW_TO_OLD_MAP = new Map(KANJI_VARIANT_PAIRS);
const OLD_TO_NEW_MAP = new Map(
  KANJI_VARIANT_PAIRS.map(([modern, legacy]) => [legacy, modern]),
);

export function convertNewToOld(text) {
  return convertCharacters(text, NEW_TO_OLD_MAP);
}

export function convertOldToNew(text) {
  return convertCharacters(text, OLD_TO_NEW_MAP);
}

function convertCharacters(text, dictionary) {
  if (!text) {
    return text;
  }

  return Array.from(
    text,
    (character) => dictionary.get(character) ?? character,
  ).join("");
}
