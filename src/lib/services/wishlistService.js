import { db } from '../db';

export async function addWishlistItem(noteId, itemData) {
  try {
    const newId = crypto.randomUUID();
    const item = {
      id: newId,
      folder_id: noteId,
      note_id: noteId, // backward compatibility
      is_completed: false,
      sort_order: Date.now(),
      ...itemData
    };
    await db.wishlist_items.add(item);
    return newId;
  } catch (error) {
    console.error(`Error adding wishlist item to folder ${noteId}:`, error);
    throw error;
  }
}

export async function getWishlistTotalCost(noteId) {
  try {
    const items = await db.wishlist_items.where('folder_id').equals(noteId).toArray();
    return items
      .filter(item => !item.is_completed)
      .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  } catch (error) {
    console.error(`Error getting wishlist total cost for folder ${noteId}:`, error);
    return 0;
  }
}
