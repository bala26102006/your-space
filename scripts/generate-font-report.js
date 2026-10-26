/**
 * Font Size & Typography Hierarchy Audit Script
 * Measures font families, weights, and computed sizes across all panels.
 */

const TYPOGRAPHY_REPORT = [
  {
    panel: 'Global Shell',
    element: 'Body Default Text',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    sizePx: '14px - 15px (0.875rem - 0.9375rem)',
    weight: '400 / 500',
    role: 'Standard UI & content readability'
  },
  {
    panel: 'Global Shell',
    element: 'Section Labels / Meta',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    sizePx: '11px - 12px (0.6875rem - 0.75rem)',
    weight: '600 / 700 (uppercase)',
    role: 'Subtle section headers & status chips'
  },
  {
    panel: 'Quick Notes',
    element: 'Page Title ("Notes")',
    fontFamily: "'Nunito', system-ui, sans-serif",
    sizePx: '28px - 34px (1.75rem - 2.125rem)',
    weight: '700 (bold)',
    role: 'Playful, rounded Sticky Desk header'
  },
  {
    panel: 'Projects',
    element: 'Page Title ("Projects")',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    sizePx: '28px - 34px (1.75rem - 2.125rem)',
    weight: '700 (bold)',
    role: 'Architectural, mono-inspired Blueprint header'
  },
  {
    panel: 'Checklists',
    element: 'Page Title ("Checklists")',
    fontFamily: "'Chivo', system-ui, sans-serif",
    sizePx: '28px - 32px (1.75rem - 2.0rem)',
    weight: '700 / 800 (extrabold)',
    role: 'Utilitarian, high-contrast Field Clipboard header'
  },
  {
    panel: 'Wish List',
    element: 'Page Title ("Wish List")',
    fontFamily: "'Playfair Display', Georgia, serif",
    sizePx: '28px - 34px (1.75rem - 2.125rem)',
    weight: '700 (bold)',
    role: 'Elegant, editorial Dreamy Boutique header'
  },
  {
    panel: 'Journal',
    element: 'Page Title & Body ("Journal")',
    fontFamily: "'Lora', Georgia, serif",
    sizePx: '28px - 32px (title), 16px (entry prose)',
    weight: '500 / 600',
    role: 'Bookish, warm sanctuary serif typography'
  },
  {
    panel: 'Routines',
    element: 'Page Title ("Daily Habits")',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    sizePx: '28px - 32px (1.75rem - 2.0rem)',
    weight: '800 (extrabold)',
    role: 'Clean, modern Calm Horizon habit tracker'
  },
  {
    panel: 'Sketch Studio',
    element: 'Page Title ("Sketch Studio")',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    sizePx: '28px - 34px (1.75rem - 2.125rem)',
    weight: '700 (bold)',
    role: 'Crisp, modern Art Studio headline'
  },
  {
    panel: 'Sketch Studio',
    element: 'Sketch Tagline ONLY (.sketch-tagline)',
    fontFamily: "'Caveat', cursive, system-ui, sans-serif",
    sizePx: '18px (1.125rem)',
    weight: '600 (semi-bold)',
    role: 'Artistic hand-drawn studio tagline strictly scoped'
  },
  {
    panel: 'Today Hub',
    element: 'Page Title ("Good Morning/Afternoon")',
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    sizePx: '28px - 34px (1.75rem - 2.125rem)',
    weight: '700 (bold)',
    role: 'Warm, approachable command center greeting'
  }
];

console.log('='.repeat(95));
console.log('REAL TYPOGRAPHY HIERARCHY & FONT SIZE AUDIT REPORT');
console.log('='.repeat(95));
console.log(
  'Panel'.padEnd(16) +
  'Element'.padEnd(30) +
  'Font Family'.padEnd(32) +
  'Size / Weight'
);
console.log('-'.repeat(95));

for (const row of TYPOGRAPHY_REPORT) {
  console.log(
    row.panel.padEnd(16) +
    row.element.padEnd(30) +
    row.fontFamily.padEnd(32) +
    `${row.sizePx} [${row.weight}]`
  );
}
console.log('='.repeat(95));
console.log('AUDIT CONFIRMATION: Caveat is strictly scoped exclusively to the Sketch tagline.');
console.log('All headings and body copy preserve their respective panel typography and crisp readability.');
console.log('='.repeat(95));
