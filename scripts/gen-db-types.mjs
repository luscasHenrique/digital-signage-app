// Gera src/types/database.ts a partir do banco local (`npx supabase start`).
// Só sobrescreve o arquivo se a geração der certo.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import ts from "typescript";

const file = "src/types/database.ts";
const raw = execSync("npx supabase gen types typescript --local --schema public", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});

// A CLI gera tudo numa linha só: reimprime com o compilador do TypeScript
const source = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true);
const printed = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(source);

writeFileSync(
  file,
  "// Gerado por `npm run db:types` (supabase gen types). Não edite à mão.\n" +
    printed.replace(/ {4}/g, "  ")
);
console.log(`${file} atualizado.`);
