// src/components/admin/advertisements/AdvertisementForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
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
// 2. IMPORTAR COMPONENTES DO COMMAND E BADGE
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

// Esquema de validação do formulário, preparado para ser executado no servidor (SSR-safe).
const formSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),
    type: z.nativeEnum(AdvertisementType),
    // Usamos z.any() para ser seguro no servidor. A validação real do ficheiro é feita no .refine() abaixo.
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
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "A data final deve ser igual ou posterior à data inicial.",
    path: ["end_date"],
  })
  .refine(
    (data) => {
      const isUpload =
        data.type === AdvertisementType.IMAGE_UPLOAD ||
        data.type === AdvertisementType.VIDEO_UPLOAD;
      const isLink =
        data.type === AdvertisementType.IMAGE_LINK ||
        data.type === AdvertisementType.VIDEO_LINK ||
        data.type === AdvertisementType.EMBED_LINK;

      if (isLink) {
        return (
          !!data.content_url &&
          z.string().url().safeParse(data.content_url).success
        );
      }
      if (isUpload) {
        // A validação no cliente irá verificar se é um FileList.
        return (
          (data.content_file instanceof FileList &&
            data.content_file.length > 0) ||
          !!data.content_url
        );
      }
      return false; // Nenhum tipo selecionado ainda
    },
    {
      message:
        "Um ficheiro (para Upload) ou uma URL válida (para Link) é obrigatório.",
      path: ["content_url"], // O erro será mostrado no campo de URL ou ficheiro
    }
  );

type FormSchemaData = z.infer<typeof formSchema>;

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
  const form = useForm<FormSchemaData>({
    resolver: zodResolver(formSchema),
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
      status: initialData?.status || AdvertisementStatus.ACTIVE,
      company_ids: initialData?.companies.map((c) => c.id) || [],
      overlay_text: initialData?.overlay_text || "",
      overlay_position: initialData?.overlay_position || OverlayPosition.BOTTOM,
      overlay_bg_color: initialData?.overlay_bg_color || "#000000",
      overlay_text_color: initialData?.overlay_text_color || "#FFFFFF",
    },
  });

  const adType = form.watch("type");
  const fileRef = form.register("content_file");
  const overlayText = form.watch("overlay_text");

  const onSubmit = async (data: FormSchemaData) => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (
        key === "content_file" &&
        value instanceof FileList &&
        value.length > 0
      ) {
        formData.append("content_file", value[0]);
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString());
      } else if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else if (value != null && key !== "content_file") {
        formData.append(key, String(value));
      }
    });

    if (
      initialData &&
      !formData.has("content_file") &&
      initialData.content_url
    ) {
      formData.append("content_url", initialData.content_url);
    }

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
            form.setError(key as keyof FormSchemaData, {
              message: (value as string[]).join(", "),
            });
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1  gap-6">
          {/* Coluna da Esquerda */}

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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Anúncio</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("content_url", "");
                    form.setValue("content_file", undefined);
                    form.clearErrors("content_url");
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={AdvertisementType.IMAGE_UPLOAD}>
                      Upload de Imagem
                    </SelectItem>
                    <SelectItem value={AdvertisementType.VIDEO_UPLOAD}>
                      Upload de Vídeo
                    </SelectItem>
                    <SelectItem value={AdvertisementType.IMAGE_LINK}>
                      Link de Imagem
                    </SelectItem>
                    <SelectItem value={AdvertisementType.VIDEO_LINK}>
                      Link de Vídeo
                    </SelectItem>
                    <SelectItem value={AdvertisementType.EMBED_LINK}>
                      Link de Incorporação
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* --- CAMPO DE CONTEÚDO CONDICIONAL --- */}
          {adType?.includes("LINK") ? (
            <FormField
              control={form.control}
              name="content_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Conteúdo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://exemplo.com/imagem.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : adType?.includes("UPLOAD") ? (
            <FormField
              control={form.control}
              name="content_file"
              render={() => (
                <FormItem>
                  <FormLabel>Ficheiro do Anúncio</FormLabel>
                  <FormControl>
                    <Input
                      id="dropzone-file"
                      type="file"
                      {...fileRef}
                      accept={
                        adType === AdvertisementType.IMAGE_UPLOAD
                          ? "image/*"
                          : "video/mp4,video/webm"
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {/* --- FIM DO CAMPO CONDICIONAL --- */}

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
          <div className="grid grid-cols-2  gap-6">
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
            name="company_ids"
            render={({ field }) => (
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
                      {/* O LIST É QUEM ROLA */}
                      <CommandList
                        className="max-h-44 overflow-y-auto overscroll-contain"
                        onWheel={(e) => e.stopPropagation()} // ajuda se houver scroll lock externo
                        onWheelCapture={(e) => e.stopPropagation()} // reforço contra Dialog/Drawer
                      >
                        <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                        <CommandGroup>
                          {companies.map((company) => (
                            <CommandItem
                              key={company.id}
                              value={company.name}
                              onSelect={() => {
                                const current = field.value ?? [];
                                field.onChange(
                                  current.includes(company.id)
                                    ? current.filter((id) => id !== company.id)
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
            )}
          />

          {/* Secção de Overlay */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-lg font-medium">Overlay Opcional</h3>
            <FormField
              control={form.control}
              name="overlay_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto do Overlay</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escreva uma mensagem para sobrepor ao anúncio..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {overlayText && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end animate-in fade-in-50">
                <FormField
                  control={form.control}
                  name="overlay_position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posição</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={OverlayPosition.TOP}>
                            Topo
                          </SelectItem>
                          <SelectItem value={OverlayPosition.BOTTOM}>
                            Rodapé
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overlay_bg_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Fundo</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} className="h-10 p-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overlay_text_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} className="h-10 p-1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

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
