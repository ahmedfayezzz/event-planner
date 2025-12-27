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

/**
 * Sponsor statuses for tracking engagement lifecycle
 */
export const SPONSOR_STATUSES = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "sponsored", label: "تمت الرعاية" },
  { value: "interested_again", label: "مهتم بالرعاية مره اخرى" },
  { value: "interested_permanent", label: "مهتم بالرعاية بشكل دائم" },
] as const;

export type SponsorStatus = (typeof SPONSOR_STATUSES)[number]["value"];

/**
 * Get the label for a sponsor status value
 */
export function getSponsorStatusLabel(value: string): string {
  const status = SPONSOR_STATUSES.find((s) => s.value === value);
  return status?.label || value;
}

/**
 * Get color class for sponsor status badge
 */
export function getSponsorStatusColor(value: string): string {
  switch (value) {
    case "new":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "contacted":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "sponsored":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "interested_again":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "interested_permanent":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-200";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-200";
  }
}

// DEPRECATED: Use SPONSORSHIP_TYPES instead
export const HOSTING_TYPES = SPONSORSHIP_TYPES;
export type HostingType = SponsorshipType;
export const getHostingTypeLabel = getSponsorshipTypeLabel;

/**
 * Guest titles (honorifics)
 */
export const GUEST_TITLES = [
  { value: "د.", label: "د." },
  { value: "م.", label: "م." },
  { value: "أ.د.", label: "أ.د." },
  { value: "أ.", label: "أ." },
  { value: "الشيخ", label: "الشيخ" },
] as const;

export type GuestTitle = (typeof GUEST_TITLES)[number]["value"];

/**
 * Get the label for a guest title value
 */
export function getGuestTitleLabel(value: string): string {
  const title = GUEST_TITLES.find((t) => t.value === value);
  return title?.label || value;
}
