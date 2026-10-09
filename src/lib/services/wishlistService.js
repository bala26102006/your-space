import { db } from '../db';
import { uuidv4 } from '../uuid';

export const wishlistService = {
  async addWishlistItem(itemData) {
    try {
      const id = uuidv4();
      const newItem = {
        id,
        is_completed: 0,
        ...itemData
      };
      await db.wishlist_items.add(newItem);
      return newItem;
    } catch (error) {
      console.error('Error adding wishlist item:', error);
      throw error;
    }
  },

  async getWishlistTotalCost(folderId = null) {
    try {
      let items;
      if (folderId) {
        items = await db.wishlist_items.where('folder_id').equals(folderId).toArray();
      } else {
        items = await db.wishlist_items.toArray();
      }
      
      const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      return total;
    } catch (error) {
      console.error('Error calculating wishlist total cost:', error);
      throw error;
    }
  }
};
