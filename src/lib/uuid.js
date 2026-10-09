/**
 * Safe UUID v4 generator with fallbacks for non-secure contexts and environments without crypto.randomUUID.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fall through to fallback
    }
  }

  // Cryptographically stronger random values if crypto.getRandomValues is available
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
    } catch (e) {
      // Fall through
    }
  }

  // RFC4122 v4 math-based fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const v4 = generateUUID;
export const uuidv4 = generateUUID;
export default generateUUID;
