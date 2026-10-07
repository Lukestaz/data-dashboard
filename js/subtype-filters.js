export function subtypeLabel(merchant) {
  return merchant.displaySubType || merchant.subType || merchant.sourceSubType || 'Unspecified';
}
export function subtypeOptions(merchants, category) {
  const counts = new Map();
  for (const merchant of merchants) {
    if (category !== 'All' && merchant.category !== category) continue;
    const label = subtypeLabel(merchant);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].map(([value, count]) => ({value, count})).sort((a, b) => a.value.localeCompare(b.value));
}
export function subtypeMatches(merchant, subtype) {
  return subtype === 'All' || subtypeLabel(merchant) === subtype;
}
