/**
 * Search utilities for Arabic text normalization and smart search
 */

/**
 * Normalizes Arabic text for consistent search matching.
 * Handles:
 * - Alef variations (أ إ آ → ا)
 * - Hamza on letters (ؤ → و, ئ → ي)
 * - Ta Marbuta (ة → ه)
 * - Alef Maksura (ى → ي)
 * - Diacritical marks/Tashkeel removal
 * - Case-insensitive (lowercase)
 * - Whitespace normalization
 */
export function normalizeArabic(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove Arabic diacritical marks (tashkeel: fatha, kasra, damma, sukun, shadda, etc.)
      .replace(/[\u064B-\u065F\u0670]/g, "")
      // Normalize alef variations (أ إ آ ٱ → ا)
      .replace(/[أإآٱ]/g, "ا")
      // Normalize hamza on waw (ؤ → و)
      .replace(/ؤ/g, "و")
      // Normalize hamza on ya (ئ → ي)
      .replace(/ئ/g, "ي")
      // Normalize ta marbuta (ة → ه)
      .replace(/ة/g, "ه")
      // Normalize alef maksura (ى → ي)
      .replace(/ى/g, "ي")
      // Lowercase for case-insensitive matching
      .toLowerCase()
      // Trim leading/trailing whitespace
      .trim()
      // Collapse multiple spaces into single space
      .replace(/\s+/g, " ")
  );
}

/**
 * Prepares a search term for database query.
 * Returns normalized text ready for use in Prisma contains queries.
 */
export function prepareSearchTerm(term: string): string {
  return normalizeArabic(term);
}

/**
 * Checks if a text matches a search term after normalization.
 * Useful for client-side filtering.
 *
 * @param text - The text to search in
 * @param searchTerm - The search term to look for
 * @returns true if the normalized text contains the normalized search term
 */
export function normalizedIncludes(
  text: string | null | undefined,
  searchTerm: string
): boolean {
  if (!text || !searchTerm) return false;
  return normalizeArabic(text).includes(normalizeArabic(searchTerm));
}

/**
 * Creates a Prisma-compatible search filter for multiple fields.
 * Adds mode: "insensitive" for case-insensitive search.
 *
 * @param search - The search term
 * @param fields - Array of field names to search in
 * @returns Prisma OR clause for searching
 */
export function createSearchFilter(
  search: string,
  fields: string[]
): { OR: Array<Record<string, { contains: string; mode: "insensitive" }>> } | undefined {
  if (!search?.trim()) return undefined;

  const normalizedSearch = normalizeArabic(search);

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: normalizedSearch,
        mode: "insensitive" as const,
      },
    })),
  };
}
