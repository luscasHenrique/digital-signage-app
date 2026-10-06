import { themeScript } from "./theme-store";

/** Coloque dentro de <head> no layout raiz. Aplica o tema antes da primeira pintura (sem flash). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
