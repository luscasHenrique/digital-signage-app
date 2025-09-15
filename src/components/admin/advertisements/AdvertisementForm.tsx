// src/components/admin/advertisements/AdvertisementForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AdvertisementStatus,
  AdvertisementType,
  Company,
  OverlayPosition,
} from "@/types";
import {
  createAdvertisement,
  updateAdvertisement,
} from "@/actions/advertisements";
import { AdvertisementWithCompanies } from "./AdvertisementsClient";

// 1. DEFINIÇÃO DO ESQUEMA DE SAÍDA (OUTPUT/TRANSFORMADO)
// Este esquema define a forma final dos dados após a transformação do Zod.
const adOutputSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),
    // CORREÇÃO: Removido o parâmetro de erro inválido.
    type: z.nativeEnum(AdvertisementType),
    content_url: z.string().url("Por favor, insira uma URL válida."),
    // CORREÇÃO: Removido o parâmetro de erro inválido.
    start_date: z.date(),
    end_date: z.date(),
    duration_seconds: z
      .string()
      .refine(
        (val) => !isNaN(Number(val)) && Number(val) >= 5,
        "A duração mínima é 5 segundos."
      ),
    // .default() é a transformação que causa a diferença entre input e output
    status: z
      .nativeEnum(AdvertisementStatus)
      .default(AdvertisementStatus.ACTIVE),
    company_ids: z.array(z.string()).min(1, "Selecione ao menos uma empresa."),
    overlay_text: z.string().optional(),
    overlay_position: z.nativeEnum(OverlayPosition).optional(),
    overlay_bg_color: z.string().optional(),
    overlay_text_color: z.string().optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "A data final deve ser igual ou posterior à data inicial.",
    path: ["end_date"],
  });

// 2. DEFINIÇÃO DOS TIPOS DE ENTRADA (INPUT) E SAÍDA (OUTPUT)
type AdFormInput = z.input<typeof adOutputSchema>;
type AdFormOutput = z.output<typeof adOutputSchema>;

interface AdvertisementFormProps {
  initialData: AdvertisementWithCompanies | null;
  companies: Company[];
  onSuccess: () => void;
}

export function AdvertisementForm({
  initialData,
  companies,
  onSuccess,
}: AdvertisementFormProps) {
  // 3. USAR A ASSINATURA COMPLETA E CORRETA DO useForm
  const form = useForm<AdFormInput, undefined, AdFormOutput>({
    resolver: zodResolver(adOutputSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      title: initialData?.title || "",
      description: initialData?.description || "",
      type: initialData?.type || undefined,
      content_url: initialData?.content_url || "",
      start_date: initialData?.start_date
        ? new Date(initialData.start_date)
        : undefined,
      end_date: initialData?.end_date
        ? new Date(initialData.end_date)
        : undefined,
      duration_seconds: String(initialData?.duration_seconds || 15),
      status: initialData?.status, // Sem o default, o Zod cuida disso
      company_ids: initialData?.companies.map((c) => c.id) || [],
      overlay_text: initialData?.overlay_text || "",
      overlay_position: initialData?.overlay_position || undefined,
      overlay_bg_color: initialData?.overlay_bg_color || "#000000",
      overlay_text_color: initialData?.overlay_text_color || "#FFFFFF",
    },
  });

  // 4. O TIPO DE 'data' no onSubmit AGORA É AdFormOutput, O TIPO CORRETO E TRANSFORMADO
  const onSubmit = async (data: AdFormOutput) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof Date) {
        formData.append(key, value.toISOString());
      } else if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else if (value != null) {
        formData.append(key, String(value));
      }
    });

    const action = initialData ? updateAdvertisement : createAdvertisement;
    const result = await action(formData);

    if (result.success) {
      if (typeof result.message === "string") toast.success(result.message);
      onSuccess();
    } else {
      if (result.message && typeof result.message === "object") {
        Object.entries(result.message).forEach(([key, value]) => {
          if (key === "_server") toast.error(value.join(", "));
          else
            form.setError(key as keyof AdFormInput, {
              message: (value as string[]).join(", "),
            });
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* ... O resto do seu JSX continua igual ... */}
        {/* Coluna da Esquerda */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (Opcional)</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Anúncio</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={AdvertisementType.IMAGE}>
                      Imagem
                    </SelectItem>
                    <SelectItem value={AdvertisementType.VIDEO}>
                      Vídeo
                    </SelectItem>
                    <SelectItem value={AdvertisementType.EMBED}>
                      Incorporação (Embed)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Conteúdo</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração (segundos)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Coluna da Direita */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Escolha uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Fim</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Escolha uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="company_ids"
            render={() => (
              <FormItem>
                <FormLabel>Exibir nas Empresas</FormLabel>
                <div className="space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                  {companies.map((company) => (
                    <FormField
                      key={company.id}
                      control={form.control}
                      name="company_ids"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(company.id)}
                              onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                return checked
                                  ? field.onChange([
                                      ...currentValue,
                                      company.id,
                                    ])
                                  : field.onChange(
                                      currentValue.filter(
                                        (id) => id !== company.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {company.name}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="md:col-span-2">
          <LoadingButton
            type="submit"
            loading={form.formState.isSubmitting}
            className="w-full"
          >
            {initialData ? "Salvar Alterações" : "Criar Anúncio"}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
