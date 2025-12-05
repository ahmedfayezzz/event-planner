/**
 * Hosting types available for users to volunteer
 */
export const HOSTING_TYPES = [
  { value: "dinner", label: "عشاء" },
  { value: "dessert", label: "حلا" },
  { value: "drinks", label: "مشروبات" },
  { value: "coffee", label: "قهوة وشاي" },
  { value: "snacks", label: "مقبلات" },
  { value: "other", label: "أخرى" },
] as const;

export type HostingType = (typeof HOSTING_TYPES)[number]["value"];

/**
 * Get the label for a hosting type value
 */
export function getHostingTypeLabel(value: string): string {
  const type = HOSTING_TYPES.find((t) => t.value === value);
  return type?.label || value;
}
