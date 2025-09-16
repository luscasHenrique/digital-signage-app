"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Company } from "@/types";
import { ControllerRenderProps } from "react-hook-form";

// ATUALIZADO: Importamos apenas os tipos que realmente usamos
import { AdvertisementFormSchemaData } from "@/lib/schemas";

// A interface agora usa o tipo importado, resolvendo qualquer incompatibilidade
interface CompanySelectorProps {
  field: ControllerRenderProps<AdvertisementFormSchemaData, "company_ids">;
  companies: Company[];
}

export function CompanySelector({ field, companies }: CompanySelectorProps) {
  return (
    <FormItem className="flex flex-col">
      <FormLabel>Exibir nas Empresas</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between h-auto min-h-10"
            >
              <div className="flex gap-1 flex-wrap">
                {field.value && field.value.length > 0 ? (
                  companies
                    .filter((c) => field.value.includes(c.id))
                    .map((c) => (
                      <Badge variant="secondary" key={c.id}>
                        {c.name}
                      </Badge>
                    ))
                ) : (
                  <span className="text-muted-foreground">
                    Selecione as empresas...
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0">
          <Command>
            <CommandInput placeholder="Procurar empresa..." />
            <CommandList>
              <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
              <CommandGroup>
                {companies.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={company.name}
                    onSelect={() => {
                      const current = Array.isArray(field.value)
                        ? field.value
                        : [];
                      field.onChange(
                        current.includes(company.id)
                          ? current.filter((id: string) => id !== company.id)
                          : [...current, company.id]
                      );
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        field.value?.includes(company.id)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    {company.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
}
