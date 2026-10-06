export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "lg-theme";

/**
 * Script inline que roda ANTES da primeira pintura e aplica data-theme no <html>.
 * Evita o "flash" do tema errado. Mantém a mesma lógica de resolve() abaixo.
 */
export const themeScript = `(function(){try{var k="${THEME_STORAGE_KEY}";var p=localStorage.getItem(k)||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {}
  return "system";
}

export function readResolved(): ResolvedTheme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function apply(resolved: ResolvedTheme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("lg-theme-transition");
    window.setTimeout(() => root.classList.remove("lg-theme-transition"), 450);
  }
  root.setAttribute("data-theme", resolved);
}

export function setPreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {}
  apply(preference === "system" ? systemTheme() : preference, true);
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readPreference() === "system") {
      apply(systemTheme(), true);
      emit();
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const pref = readPreference();
    apply(pref === "system" ? systemTheme() : pref, true);
    emit();
  };

  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}
