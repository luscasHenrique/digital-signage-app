"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ImageIcon } from "lucide-react";
import { RgbaColorPicker } from "@/components/ui/RgbaColorPicker";

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

// Schema e tipos centralizados
import {
  advertisementFormSchema,
  AdvertisementFormSchemaData,
} from "@/lib/schemas";

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

// Subcomponentes
import { CompanySelector } from "./CompanySelector";
import { ContentFields } from "./ContentFields";

// ✅ Tipo do payload aceito pelas actions (sem duplicar tipo/schema)
type ActionInput = Parameters<typeof createAdvertisement>[0];

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

  const form = useForm<AdvertisementFormSchemaData>({
    resolver: zodResolver(advertisementFormSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      title: initialData?.title || "",
      description: initialData?.description || "",
      type: initialData?.type,
      content_url: initialData?.content_url || "",

      // thumbnail
      thumbnail_url: initialData?.thumbnail_url ?? "",
      thumbnail_file: undefined,

      start_date: initialData?.start_date
        ? new Date(initialData.start_date)
        : null,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : null,
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

  const onSubmit = async (data: AdvertisementFormSchemaData) => {
    if (!data.start_date || !data.end_date || !data.type) {
      toast.error(
        "Por favor, preencha todos os campos obrigatórios (Tipo, Data de Início, Data de Fim)."
      );
      return;
    }

    let finalContentUrl = data.content_url;
    let finalThumbnailUrl = data.thumbnail_url;

    // ✅ Tipar corretamente os arquivos vindos do form
    const file = (data.content_file as FileList | undefined)?.[0];
    const thumbFile = (data.thumbnail_file as FileList | undefined)?.[0];

    const isUpload =
      data.type === AdvertisementType.IMAGE_UPLOAD ||
      data.type === AdvertisementType.VIDEO_UPLOAD;

    try {
      setIsUploading(true);
      setUploadProgress(5);

      // 1) Upload do conteúdo principal, se for upload
      if (isUpload && file) {
        const signedUrlResult = await getSignedUploadUrl({
          fileName: file.name,
          fileType: file.type,
        });
        if (!signedUrlResult.success || !signedUrlResult.data) {
          toast.error(String(signedUrlResult.message));
          setIsUploading(false);
          return;
        }
        const { url, path } = signedUrlResult.data;

        setUploadProgress(25);
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadResponse.ok) {
          toast.error("Falha no upload do arquivo do anúncio.");
          setIsUploading(false);
          return;
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const bucketName = "advertisements";
        finalContentUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
      }

      setUploadProgress(50);

      // 2) Upload da THUMBNAIL (obrigatória quando VIDEO_UPLOAD)
      if (
        data.type === AdvertisementType.VIDEO_UPLOAD ||
        data.type === AdvertisementType.VIDEO_LINK
      ) {
        if (thumbFile) {
          const signedThumb = await getSignedUploadUrl({
            fileName: thumbFile.name,
            fileType: thumbFile.type,
          });
          if (!signedThumb.success || !signedThumb.data) {
            toast.error(String(signedThumb.message));
            setIsUploading(false);
            return;
          }
          const { url: thumbUrl, path: thumbPath } = signedThumb.data;

          setUploadProgress(70);
          const uploadThumbResp = await fetch(thumbUrl, {
            method: "PUT",
            body: thumbFile,
            headers: { "Content-Type": thumbFile.type },
          });
          if (!uploadThumbResp.ok) {
            toast.error("Falha no upload da thumbnail.");
            setIsUploading(false);
            return;
          }
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const bucketName = "advertisements";
          finalThumbnailUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${thumbPath}`;
        }
        // Se não teve arquivo, usaremos a thumbnail_url já informada no input (validada no schema)
      }

      setUploadProgress(100);

      // ✅ Tipar o payload da action (e remover campos de arquivo)
      const finalData: ActionInput = {
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        content_url: finalContentUrl,
        thumbnail_url: finalThumbnailUrl,
        start_date: data.start_date.toISOString(),
        end_date: data.end_date.toISOString(),
        duration_seconds: Number(data.duration_seconds),
        status: data.status,
        company_ids: data.company_ids,
        overlay_text: data.overlay_text,
        overlay_position: data.overlay_position,
        overlay_bg_color: data.overlay_bg_color,
        overlay_text_color: data.overlay_text_color,
      };

      const action = initialData ? updateAdvertisement : createAdvertisement;
      const result = await action(finalData);

      setIsUploading(false);

      if (result.success) {
        toast.success(String(result.message));
        onSuccess();
      } else {
        if (result.message && typeof result.message === "object") {
          Object.entries(result.message).forEach(([key, value]) => {
            if (key === "_server") toast.error((value as string[]).join(", "));
            else
              form.setError(key as keyof AdvertisementFormSchemaData, {
                message: (value as string[]).join(", "),
              });
          });
        } else {
          toast.error(String(result.message ?? "Erro ao salvar anúncio."));
        }
      }
    } catch (e) {
      setIsUploading(false);
      toast.error("Erro inesperado ao salvar anúncio.");
      console.error(e);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1  gap-6">
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

          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Anúncio</FormLabel>
                  <Select
                    // ✅ tipar value para o enum
                    onValueChange={(value: AdvertisementType) => {
                      field.onChange(value);
                      // limpar campos ao trocar o tipo
                      form.setValue("content_url", "");
                      form.setValue("content_file", undefined);
                      form.setValue("thumbnail_url", "");
                      form.setValue("thumbnail_file", undefined);
                      form.clearErrors([
                        "content_url",
                        "content_file",
                        "thumbnail_url",
                        "thumbnail_file",
                      ]);
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
                        Link de Vídeo .MP4
                      </SelectItem>
                      <SelectItem value={AdvertisementType.EMBED_LINK}>
                        Link de Incorporação (Embed)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ContentFields form={form} adType={adType} />

            {/* Barra de progresso de upload */}
            {isUploading && (
              <div className="flex items-center gap-2 pt-2 col-span-2">
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

          {/* Datas */}
          <div className="grid grid-cols-2 gap-6">
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
                        selected={field.value ?? undefined}
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
                        selected={field.value ?? undefined}
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

          {/* Empresas */}
          <FormField
            control={form.control}
            name="company_ids"
            render={({ field }) => (
              <CompanySelector field={field} companies={companies} />
            )}
          />

          {/* Descrição */}
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
        </div>
        {/* Overlay Opcional */}
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
                      <RgbaColorPicker field={field} />
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
                    <FormLabel>Cor do Texto </FormLabel>
                    <FormControl>
                      <RgbaColorPicker field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
        {/* Thumbnail (só para vídeo upload) */}+{" "}
        {(adType === AdvertisementType.VIDEO_UPLOAD ||
          adType === AdvertisementType.VIDEO_LINK) && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Thumbnail (capa) — opcional para vídeo (upload ou link)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload de imagem */}
              <FormField
                control={form.control}
                name="thumbnail_file"
                render={() => (
                  <FormItem>
                    <FormLabel>Arquivo da Capa (imagem)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          form.setValue(
                            "thumbnail_file",
                            e.target.files ?? undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ou URL direta */}
              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      URL da Capa (opcional, se não enviar arquivo)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
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
