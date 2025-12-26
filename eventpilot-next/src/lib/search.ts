/**
 * Search utilities for Arabic text normalization and smart search
 */

import { Prisma } from "@prisma/client";

/**
 * Arabic character mappings for PostgreSQL translate() function.
 * These must be the same length and in corresponding order.
 */
const ARABIC_FROM_CHARS = "أإآٱؤئةى";
const ARABIC_TO_CHARS = "ااااوييي";

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

/**
 * Creates a Prisma SQL fragment for Arabic-aware text search.
 * Uses PostgreSQL translate() function to normalize Arabic characters in the database column.
 *
 * @param column - The database column path (e.g., '"User"."name"' or '"Sponsor"."name"')
 * @param search - The search term
 * @returns Prisma.Sql fragment for use in raw queries
 */
export function arabicContains(column: string, search: string): Prisma.Sql {
  const normalized = normalizeArabic(search);
  // Use PostgreSQL translate() to normalize Arabic chars in database, then compare with ILIKE
  return Prisma.sql`translate(lower(COALESCE(${Prisma.raw(column)}, '')), ${ARABIC_FROM_CHARS}, ${ARABIC_TO_CHARS}) LIKE '%' || ${normalized} || '%'`;
}

/**
 * Creates a combined OR condition for multiple columns with Arabic search.
 *
 * @param columns - Array of database column paths
 * @param search - The search term
 * @returns Prisma.Sql fragment with OR conditions
 */
export function arabicSearchOr(columns: string[], search: string): Prisma.Sql {
  if (columns.length === 0) {
    return Prisma.sql`FALSE`;
  }

  const conditions = columns.map(col => arabicContains(col, search));

  // Join conditions with OR
  let result = conditions[0]!;
  for (let i = 1; i < conditions.length; i++) {
    result = Prisma.sql`${result} OR ${conditions[i]}`;
  }

  return Prisma.sql`(${result})`;
}
