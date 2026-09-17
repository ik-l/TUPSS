// Restaurant swap suggestions: matched by keywords found in a logged/typed item name.
// Each rule optionally excludes matches that already look like the "swap" version,
// so we don't suggest a swap for something the user already ordered healthy.

const SWAP_RULES = [
  {
    restaurant: 'In-N-Out',
    match: ['in-n-out', 'in n out', 'innout', 'double double', 'cheeseburger', 'hamburger'],
    exclude: ['protein style'],
    suggestion: 'Try it "Protein Style" (lettuce wrap, no bun) — cuts calories and carbs a lot.',
  },
  {
    restaurant: 'Chick-fil-A',
    match: ['chick-fil-a', 'chick fil a', 'chickfila', 'nuggets', 'buffalo fries', 'waffle fries', 'cool wrap'],
    exclude: ['grilled'],
    suggestion: 'Swap fried nuggets/fries for grilled nuggets or a grilled cool wrap, no sauce.',
  },
  {
    restaurant: 'Taco shop',
    match: ['carne asada fries', 'asada fries', 'taco shop fries'],
    exclude: ['bowl', 'no fries'],
    suggestion: 'Try a carne asada bowl, or 2 tacos with no fries, instead of asada fries.',
  },
  {
    restaurant: 'Pho',
    match: ['pho'],
    exclude: [],
    suggestion: 'Ask for less noodles, more protein/veggies, and go light on hoisin/sriracha.',
  },
];

function getSwapSuggestion(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const rule of SWAP_RULES) {
    const matched = rule.match.some((kw) => lower.includes(kw));
    if (!matched) continue;
    const excluded = rule.exclude.some((kw) => lower.includes(kw));
    if (excluded) continue;
    return { restaurant: rule.restaurant, suggestion: rule.suggestion };
  }
  return null;
}

export const Swaps = { getSwapSuggestion, SWAP_RULES };
