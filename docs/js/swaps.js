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
  {
    restaurant: 'Starbucks',
    match: ['starbucks', 'frappuccino', 'caramel macchiato'],
    exclude: ['skinny', 'nonfat', 'sugar free', 'sugar-free', 'light'],
    suggestion: 'Ask for fewer pumps of syrup, nonfat milk, and no whip — or order it "Skinny" to cut a lot of sugar.',
  },
  {
    restaurant: 'Chipotle',
    match: ['chipotle'],
    exclude: ['bowl', 'salad'],
    suggestion: 'Skip the tortilla — a burrito bowl or salad with the same fillings cuts carbs and sodium.',
  },
  {
    restaurant: 'Subway',
    match: ['subway'],
    exclude: ['salad', '6 inch', '6-inch'],
    suggestion: 'Get a 6-inch on wheat instead of a footlong, hold the cheese/mayo, and load up on veggies.',
  },
  {
    restaurant: 'Taco Bell',
    match: ['taco bell'],
    exclude: ['fresco'],
    suggestion: 'Order it "Fresco Style" (pico instead of cheese/sauce) to cut calories and sodium.',
  },
  {
    restaurant: 'Panda Express',
    match: ['panda express', 'orange chicken', 'chow mein'],
    exclude: ['string bean', 'broccoli beef', 'mixed veggie', 'grilled'],
    suggestion: 'Swap a fried entree (orange chicken, chow mein) for a steamed/grilled one like broccoli beef or mixed veggies.',
  },
  {
    restaurant: "Wendy's",
    match: ["wendy's", 'wendys', 'baconator'],
    exclude: ['jr', 'grilled'],
    suggestion: 'Go with a Jr.-size burger or a grilled chicken sandwich instead — much less sodium and calories.',
  },
  {
    restaurant: "McDonald's",
    match: ["mcdonald's", 'mcdonalds', 'big mac', 'mcnuggets'],
    exclude: ['grilled', 'snack wrap'],
    suggestion: 'Try a grilled chicken sandwich or snack wrap instead of fried nuggets/burgers to cut sodium and fat.',
  },
  {
    restaurant: 'Panera',
    match: ['panera'],
    exclude: ['half'],
    suggestion: 'Order a "half" portion (half sandwich + half salad/soup) instead of a full sandwich to cut calories and sodium.',
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
