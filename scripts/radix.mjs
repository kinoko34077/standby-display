const DIGITS = "0123456789abcdef";

export function formatRadixInteger(
  value,
  radix,
  { minWidth = 0, uppercase = false } = {},
) {
  if (!Number.isInteger(radix) || radix < 2 || radix > 16) {
    throw new RangeError("radix must be an integer from 2 through 16");
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError("value must be a non-negative integer");
  }
  if (!Number.isInteger(minWidth) || minWidth < 0) {
    throw new RangeError("minWidth must be a non-negative integer");
  }
  if (value === 0) return "0".padStart(minWidth, "0");
  let remaining = value;
  let result = "";
  while (remaining > 0) {
    result = DIGITS[remaining % radix] + result;
    remaining = Math.floor(remaining / radix);
  }
  const padded = result.padStart(minWidth, "0");
  return uppercase ? padded.toUpperCase() : padded;
}
