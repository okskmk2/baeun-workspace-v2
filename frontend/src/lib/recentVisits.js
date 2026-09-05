const STORAGE_KEY = "app.recentVisits";
const MAX_ITEMS = 5;

const readVisits = () => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeVisits = (items) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const recordRecentVisit = ({ type, id, name, imgUrl = "" }) => {
  if (!type || !id || !name) return;

  const items = readVisits().filter(
    (item) => !(item.type === type && String(item.id) === String(id))
  );
  items.unshift({ type, id, name, imgUrl, visitedAt: Date.now() });
  writeVisits(items.slice(0, MAX_ITEMS));
};

export const getRecentVisits = () => readVisits().slice(0, MAX_ITEMS);
