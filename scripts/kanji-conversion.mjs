import { createTextTransformClient } from "../vendor/text-transform.mjs";
import { KANJI_VARIANT_PAIRS } from "../vendor/kanji-fallback.mjs";

const CANONICAL_PROBE_INPUT = "国亀気旧暦体";
const CANONICAL_PROBE_OUTPUT = "國龜氣舊曆體";

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

export function createKanjiConversionService(
  fetchImpl,
  baseUrl,
) {
  const localMap = new Map(NEW_TO_OLD_MAP);
  let activeMap = localMap;
  let initializationPromise = null;
  const client = createTextTransformClient({ baseUrl, fetchImpl });

  return {
    async initialize() {
      if (initializationPromise) {
        return initializationPromise;
      }

      initializationPromise = loadCanonicalMap(client)
        .then((canonicalMap) => {
          if (canonicalMap) {
            activeMap = canonicalMap;
          }
          return Boolean(canonicalMap);
        })
        .catch((error) => {
          console.warn("Text transform API unavailable; using local kanji map", error);
          return false;
        });

      return initializationPromise;
    },

    convertNewToOld(text) {
      return convertCharacters(text, activeMap);
    },
  };
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

async function loadCanonicalMap(client) {
  const source = KANJI_VARIANT_PAIRS.map(([modern]) => modern).join("");
  const response = await client.transform(source, {
    profile: ["legacy-kanji", "general-character-replacements"],
  });
  const transformed = Array.from(response?.text ?? "");
  const sourceCharacters = Array.from(source);

  if (transformed.length !== sourceCharacters.length) {
    throw new Error("Canonical kanji map changed character count");
  }

  const canonicalMap = new Map(
    sourceCharacters.map((character, index) => [character, transformed[index]]),
  );
  const probeOutput = convertCharacters(CANONICAL_PROBE_INPUT, canonicalMap);
  if (probeOutput !== CANONICAL_PROBE_OUTPUT) {
    throw new Error("Canonical kanji map failed compatibility probe");
  }

  return canonicalMap;
}
