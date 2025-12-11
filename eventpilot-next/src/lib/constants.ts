/**
 * Sponsorship types available for sponsors
 */
export const SPONSORSHIP_TYPES = [
  { value: "dinner", label: "عشاء" },
  { value: "beverage", label: "مشروبات" },
  { value: "dessert", label: "حلا" },
  { value: "other", label: "أخرى" },
] as const;

export type SponsorshipType = (typeof SPONSORSHIP_TYPES)[number]["value"];

/**
 * Get the label for a sponsorship type value
 */
export function getSponsorshipTypeLabel(value: string): string {
  const type = SPONSORSHIP_TYPES.find((t) => t.value === value);
  return type?.label || value;
}

/**
 * Sponsor types (person or company)
 */
export const SPONSOR_TYPES = [
  { value: "person", label: "شخص" },
  { value: "company", label: "شركة" },
] as const;

export type SponsorType = (typeof SPONSOR_TYPES)[number]["value"];

/**
 * Get the label for a sponsor type value
 */
export function getSponsorTypeLabel(value: string): string {
  const type = SPONSOR_TYPES.find((t) => t.value === value);
  return type?.label || value;
}

// DEPRECATED: Use SPONSORSHIP_TYPES instead
export const HOSTING_TYPES = SPONSORSHIP_TYPES;
export type HostingType = SponsorshipType;
export const getHostingTypeLabel = getSponsorshipTypeLabel;
