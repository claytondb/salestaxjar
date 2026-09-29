/** URL slug for a state's page: "New York" → "new-york" (/sales-tax/new-york). */
export function stateSlug(stateName: string): string {
  return stateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
