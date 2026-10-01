export const STARTER_KITS = [
  { id: 'starter-kit-travel', title: '✈️ Travel & Packing', category: 'Starter Kits', items: ['Passport', 'Clothes', 'Chargers', 'Toiletries'] },
  { id: 'starter-kit-shopping', title: '🛒 Shopping', category: 'Starter Kits', items: ['Groceries', 'Household items', 'Personal care'] },
  { id: 'starter-kit-home', title: '🏠 Home & Life Admin', category: 'Starter Kits', items: ['Bills', 'Chores', 'Car maintenance'] },
  { id: 'starter-kit-goals', title: '🎯 Future Goals', category: 'Starter Kits', items: ['Yearly goals', 'Bucket list', 'Learning targets'] },
  { id: 'starter-kit-work', title: '💼 Work & Projects', category: 'Starter Kits', items: ['Pre-shoot checklist', 'Meeting prep', 'Daily tasks'] },
  { id: 'starter-kit-events', title: '🎉 Events & Parties', category: 'Starter Kits', items: ['Birthday planning', 'Gift buying'] },
  { id: 'starter-kit-health', title: '💪 Health & Fitness', category: 'Starter Kits', items: ['Gym bag', 'Meal prep', 'Doctor visit prep'] }
];

export function getStarterKitItems(kitId) {
  const kit = STARTER_KITS.find(k => k.id === kitId);
  if (!kit) return [];
  return kit.items.map((text, i) => ({
    id: `temp-${kitId}-${i}`,
    note_id: kitId,
    parent_item_id: null,
    text,
    is_completed: false,
    due_date: null,
    sort_order: i * 10
  }));
}
