export type ViewMode = "table" | "list";

const STORAGE_KEY = "admin_products_view_mode";
const CHANGE_EVENT = "admin-products-view-change";
let unsavedViewMode: ViewMode | null = null;

export function subscribeToViewMode(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    unsavedViewMode = null;
    onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function getSavedViewMode(): ViewMode {
  if (unsavedViewMode) return unsavedViewMode;
  try {
    return localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "table";
  } catch {
    return "table";
  }
}

export function setViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    unsavedViewMode = null;
  } catch {
    unsavedViewMode = mode;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
