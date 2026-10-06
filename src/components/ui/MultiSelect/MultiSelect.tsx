"use client";

import { useControllableState } from "../_internal/hooks";
import { SelectCore, type SelectCommonProps } from "../Select/Select";

export type MultiSelectProps = SelectCommonProps & {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Quantos chips aparecem no campo antes de virar "+N". Padrão: 3 */
  maxVisibleChips?: number;
  /** Mostra "Selecionar todos" (com estado indeterminado) no topo da lista */
  selectAll?: boolean;
  selectAllLabel?: string;
  /** Limite de itens; ao atingir, as demais opções ficam desabilitadas */
  maxSelected?: number;
};

/**
 * Seleção múltipla com a lista de vidro do Select: caixas de seleção,
 * chips no campo, "Selecionar todos", limite e busca opcional.
 * Backspace no campo remove o último item.
 */
export function MultiSelect({ value, defaultValue = [], onValueChange, ...props }: MultiSelectProps) {
  const [selected, setSelected] = useControllableState<string[]>(value, defaultValue, onValueChange);
  return <SelectCore {...props} multiple selected={selected} onSelectedChange={setSelected} />;
}
