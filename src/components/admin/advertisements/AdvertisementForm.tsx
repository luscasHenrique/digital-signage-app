// src/components/admin/advertisements/AdvertisementForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import {
  AdvertisementStatus,
  AdvertisementType,
  Company,
  OverlayPosition,
} from "@/types";
import {
  createAdvertisement,
  getSignedUploadUrl,
  updateAdvertisement,
} from "@/actions/advertisements";
import { AdvertisementWithCompanies } from "./AdvertisementsClient";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { CompanySelector } from "./CompanySelector";
import { ContentFields } from "./ContentFields";

// Schema Zod corrigido (removido 'required_error')
const formSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),
    // CORRIGIDO: Removida a opção inválida 'required_error'
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
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: "A data final deve ser igual ou posterior à data inicial.",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      const isUpload =
        data.type === AdvertisementType.IMAGE_UPLOAD ||
        data.type === AdvertisementType.VIDEO_UPLOAD;
      const isLink =
        data.type === AdvertisementType.IMAGE_LINK ||
        data.type === AdvertisementType.VIDEO_LINK ||
        data.type === AdvertisementType.EMBED_LINK;

      if (isLink)
        return (
          !!data.content_url &&
          z.string().url().safeParse(data.content_url).success
        );
      if (isUpload)
        return (
          (data.content_file instanceof FileList &&
            data.content_file.length > 0) ||
          !!data.content_url
        );

      return false;
    },
    {
      message:
        "Um arquivo (para Upload) ou uma URL válida (para Link) é obrigatório.",
      path: ["content_url"],
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
  const overlayText = form.watch("overlay_text");

  const onSubmit = async (data: FormSchemaData) => {
    let finalContentUrl = data.content_url;
    const file = data.content_file?.[0];

    const isUpload =
      data.type === AdvertisementType.IMAGE_UPLOAD ||
      data.type === AdvertisementType.VIDEO_UPLOAD;

    if (isUpload && file) {
      setIsUploading(true);
      setUploadProgress(10);

      const signedUrlResult = await getSignedUploadUrl({
        fileName: file.name,
        fileType: file.type,
      });

      if (!signedUrlResult.success || !signedUrlResult.data) {
        toast.error(signedUrlResult.message);
        setIsUploading(false);
        return;
      }

      const { url, path } = signedUrlResult.data;
      setUploadProgress(50);

      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        toast.error("Falha no upload do arquivo.");
        setIsUploading(false);
        return;
      }

      setUploadProgress(100);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const bucketName = "advertisements";
      finalContentUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
    }

    // Prepara os dados com os tipos corretos para a action
    const finalData = {
      ...data,
      content_url: finalContentUrl,
      start_date: data.start_date.toISOString(), // Converte Date para string
      end_date: data.end_date.toISOString(), // Converte Date para string
      duration_seconds: Number(data.duration_seconds), // Converte string para number
      content_file: undefined, // Remove o arquivo do objeto final
    };

    const action = initialData ? updateAdvertisement : createAdvertisement;
    const result = await action(finalData); // Removido 'as any'

    setIsUploading(false);

    if (result.success) {
      toast.success(result.message as string);
      onSuccess();
    } else {
      if (result.message && typeof result.message === "object") {
        Object.entries(result.message).forEach(([key, value]) => {
          if (key === "_server") toast.error((value as string[]).join(", "));
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
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
                      form.clearErrors(["content_url", "content_file"]);
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

            <ContentFields form={form} adType={adType} />
            {isUploading && (
              <div className="flex items-center gap-2 pt-2">
                <Progress value={uploadProgress} className="w-full" />
                <span className="text-sm text-muted-foreground">
                  {uploadProgress}%
                </span>
              </div>
            )}

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

          <div className="space-y-6">
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
                <CompanySelector field={field} companies={companies} />
              )}
            />
          </div>
        </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-in fade-in-50">
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
          loading={form.formState.isSubmitting || isUploading}
          className="w-full"
        >
          {isUploading
            ? `Enviando (${uploadProgress}%)`
            : initialData
            ? "Salvar Alterações"
            : "Criar Anúncio"}
        </LoadingButton>
      </form>
    </Form>
  );
}
