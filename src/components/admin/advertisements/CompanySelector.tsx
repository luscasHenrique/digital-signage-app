// src/components/admin/advertisements/CompanySelector.tsx
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
import {
  Company,
  AdvertisementType,
  AdvertisementStatus,
  OverlayPosition,
} from "@/types";
import { ControllerRenderProps } from "react-hook-form";
import { z } from "zod";

// Para reutilizar, vamos definir o schema do formulário em um local acessível
// Pode ser neste arquivo ou em um arquivo separado de schemas.
// ATENÇÃO: Este schema deve ser IDÊNTICO ao que está no AdvertisementForm.tsx
const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().optional(),
  type: z.nativeEnum(AdvertisementType),
  content_file: z.any().optional(),
  content_url: z.string().optional(),
  start_date: z.date(),
  end_date: z.date(),
  duration_seconds: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 5,
      "A duração mínima é 5 segundos."
    ),
  status: z.nativeEnum(AdvertisementStatus),
  company_ids: z.array(z.string()).min(1, "Selecione ao menos uma empresa."),
  overlay_text: z.string().optional(),
  overlay_position: z.nativeEnum(OverlayPosition).optional(),
  overlay_bg_color: z.string().optional(),
  overlay_text_color: z.string().optional(),
});

type FormSchemaData = z.infer<typeof formSchema>;

// A interface agora usa o tipo inferido do nosso schema
interface CompanySelectorProps {
  field: ControllerRenderProps<FormSchemaData, "company_ids">;
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
