/** First size+color combination that really exists AND is in stock. Used by "Quick add" and "Move to cart" so they never add a combo checkout would reject. */
export function firstAvailableVariant(p) {
    const v = p.variants.find((x) => x.available);
    return v ? { size: v.size, color: v.color } : null;
}
