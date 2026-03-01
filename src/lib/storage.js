/**
 * Storage abstraction. In production (built for deploy), localStorage is disabled
 * so users cannot persist data to their machine. All data must go through Firebase/Firestore.
 */
const isProduction = import.meta.env.PROD;

export const storageGet = (key) => {
  if (isProduction) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const storageSet = (key, value) => {
  if (isProduction) return;
  try {
    localStorage.setItem(key, value);
  } catch {}
};
