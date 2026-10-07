// src/components/admin/advertisements/AdvertisementForm.tsx
"use client";

import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Clapperboard,
  FileImage,
  FileVideo,
  Image as ImageIcon,
  Link2,
  Youtube,
} from "lucide-react";
import {
  createAdvertisement,
  updateAdvertisement,
} from "@/actions/advertisements";
import { Button } from "@/components/ui/Button/Button";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import {
  FileUpload,
  type UploadFile,
} from "@/components/ui/FileUpload/FileUpload";
import { MultiSelect } from "@/components/ui/MultiSelect/MultiSelect";
import { SegmentedControl } from "@/components/ui/SegmentedControl/SegmentedControl";
import { Select } from "@/components/ui/Select/Select";
import { Switch } from "@/components/ui/Switch/Switch";
import { TextField } from "@/components/ui/TextField/TextField";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { useToast } from "@/components/ui/Toast/Toast";
import {
  AD_TYPE_LABEL,
  endOfDay,
  isUploadType,
  isVideoType,
  startOfDay,
} from "@/lib/advertisement-display";
import { applyActionErrors } from "@/lib/form-errors";
import {
  WEEKDAY_SHORT,
  formatWeeklySchedule,
  toHHMM,
} from "@/lib/ad-weekly-schedule";
import {
  advertisementFormSchema,
  type AdvertisementFormSchemaData,
} from "@/lib/schemas";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/storage";
import {
  AdvertisementStatus,
  AdvertisementType,
  Company,
  OverlayPosition,
} from "@/types";
import type { AdvertisementWithCompanies } from "@/types";
import { ColorField } from "./ColorField";
import { useStorageUpload } from "./useStorageUpload";

type ActionInput = Parameters<typeof createAdvertisement>[0];

interface AdvertisementFormProps {
  initialData: AdvertisementWithCompanies | null;
  /** Usa initialData como modelo e cria um anúncio novo */
  duplicate?: boolean;
  companies: Company[];
  /** Empresa já marcada ao criar (ex.: na página de anúncios de uma empresa) */
  defaultCompanyId?: string;
  onSuccess: () => void;
}

const typeOptions = [
  {
    value: AdvertisementType.IMAGE_UPLOAD,
    label: AD_TYPE_LABEL[AdvertisementType.IMAGE_UPLOAD],
    description: "Envie um JPG, PNG, WEBP, GIF ou AVIF.",
    icon: <FileImage />,
  },
  {
    value: AdvertisementType.VIDEO_UPLOAD,
    label: AD_TYPE_LABEL[AdvertisementType.VIDEO_UPLOAD],
    description: "Envie um MP4, WEBM ou OGG.",
    icon: <FileVideo />,
  },
  {
    value: AdvertisementType.IMAGE_LINK,
    label: AD_TYPE_LABEL[AdvertisementType.IMAGE_LINK],
    description: "Endereço de uma imagem na internet.",
    icon: <ImageIcon />,
  },
  {
    value: AdvertisementType.VIDEO_LINK,
    label: AD_TYPE_LABEL[AdvertisementType.VIDEO_LINK],
    description: "Endereço direto de um arquivo de vídeo.",
    icon: <Link2 />,
  },
  {
    value: AdvertisementType.EMBED_LINK,
    label: AD_TYPE_LABEL[AdvertisementType.EMBED_LINK],
    description: "Link de um vídeo do YouTube.",
    icon: <Youtube />,
  },
];

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
/** Ordem dos botões: começa na segunda */
const WEEKDAY_BUTTONS = [1, 2, 3, 4, 5, 6, 0];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <h3 className="text-[length:var(--lg-text-md)]">{title}</h3>
      {children}
    </section>
  );
}

export function AdvertisementForm({
  initialData,
  duplicate = false,
  companies,
  defaultCompanyId,
  onSuccess,
}: AdvertisementFormProps) {
  const toast = useToast();
  const { createUploadHandler, keep } = useStorageUpload();
  const [uploading, setUploading] = useState({ content: false, thumb: false });

  const form = useForm<AdvertisementFormSchemaData>({
    resolver: zodResolver(advertisementFormSchema),
    defaultValues: {
      id: duplicate ? undefined : initialData?.id || undefined,
      title: initialData
        ? duplicate
          ? `${initialData.title} (cópia)`
          : initialData.title
        : "",
      description: initialData?.description || "",
      type: initialData?.type,
      content_url: initialData?.content_url || "",
      thumbnail_url: initialData?.thumbnail_url ?? "",
      start_date: initialData?.start_date
        ? new Date(initialData.start_date)
        : startOfDay(new Date()),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : null,
      duration_seconds: String(initialData?.duration_seconds || 15),
      status: initialData?.status || AdvertisementStatus.ACTIVE,
      company_ids:
        initialData?.companies.map((c) => c.id) ??
        (defaultCompanyId ? [defaultCompanyId] : []),
      overlay_text: initialData?.overlay_text || "",
      overlay_position: initialData?.overlay_position || OverlayPosition.BOTTOM,
      overlay_bg_color: initialData?.overlay_bg_color || "rgba(0, 0, 0, 0.55)",
      overlay_text_color: initialData?.overlay_text_color || "#FFFFFF",
      // Todos os dias marcados = sem restrição
      weekdays: initialData?.weekdays?.length
        ? initialData.weekdays
        : ALL_WEEKDAYS,
      daily_start: toHHMM(initialData?.daily_start),
      daily_end: toHHMM(initialData?.daily_end),
    },
  });
  const { errors, isSubmitting } = form.formState;

  const adType = form.watch("type");
  const contentUrl = form.watch("content_url");
  const startDate = form.watch("start_date");
  const overlayText = form.watch("overlay_text");
  const weekly = form.watch(["weekdays", "daily_start", "daily_end"]);
  const weeklySummary = formatWeeklySchedule({
    weekdays: weekly[0],
    daily_start: weekly[1],
    daily_end: weekly[2],
  });
  const overlay = form.watch([
    "overlay_position",
    "overlay_bg_color",
    "overlay_text_color",
  ]);
  const isUploading = uploading.content || uploading.thumb;

  const trackUploads = (key: "content" | "thumb") => (files: UploadFile[]) =>
    setUploading((prev) => ({
      ...prev,
      [key]: files.some((f) => f.status === "uploading"),
    }));

  const onSubmit = async (data: AdvertisementFormSchemaData) => {
    if (!data.type || !data.start_date || !data.end_date) return;

    const finalData: ActionInput = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      content_url: data.content_url,
      // A capa só vale para vídeos
      thumbnail_url: isVideoType(data.type) ? data.thumbnail_url : "",
      start_date: startOfDay(data.start_date).toISOString(),
      // O anúncio fica no ar até o fim do último dia
      end_date: endOfDay(data.end_date).toISOString(),
      duration_seconds: Number(data.duration_seconds),
      status: data.status,
      company_ids: data.company_ids,
      overlay_text: data.overlay_text,
      overlay_position: data.overlay_position,
      overlay_bg_color: data.overlay_bg_color,
      overlay_text_color: data.overlay_text_color,
      weekdays: data.weekdays,
      daily_start: data.daily_start,
      daily_end: data.daily_end,
    };

    const isEdit = !!initialData && !duplicate;
    const action = isEdit ? updateAdvertisement : createAdvertisement;
    const result = await action(finalData);

    if (result.success) {
      keep([finalData.content_url, finalData.thumbnail_url]);
      toast.success(String(result.message));
      onSuccess();
    } else {
      applyActionErrors(result.message, form.setError, toast.error);
    }
  };

  const companyOptions = companies.map((c) => ({
    value: c.id,
    label: c.name,
    description: `/display/${c.slug}`,
  }));

  const hasExistingUpload =
    isUploadType(adType) && !!contentUrl && adType === initialData?.type;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <Controller
        control={form.control}
        name="title"
        render={({ field }) => (
          <TextField
            {...field}
            label="Título"
            placeholder="Ex.: Promoção de inverno"
            required
            error={errors.title?.message}
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select
              label="Tipo de anúncio"
              placeholder="Selecione o tipo"
              options={typeOptions}
              value={field.value ?? null}
              onValueChange={(value) => {
                if (!value || value === field.value) return;
                field.onChange(value as AdvertisementType);
                // Conteúdo de um tipo não serve para outro
                form.setValue("content_url", "");
                form.setValue("thumbnail_url", "");
                form.clearErrors(["content_url", "thumbnail_url"]);
              }}
              required
              error={errors.type?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="duration_seconds"
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              min={5}
              inputMode="numeric"
              label="Duração"
              rightIcon={<span className="text-sm">seg</span>}
              error={errors.duration_seconds?.message}
            />
          )}
        />
      </div>

      {/* Conteúdo: arquivo ou link, conforme o tipo */}
      {adType &&
        (isUploadType(adType) ? (
          <div className="flex flex-col gap-2">
            <FileUpload
              key={adType}
              label="Arquivo do anúncio"
              multiple={false}
              accept={(adType === AdvertisementType.IMAGE_UPLOAD
                ? ALLOWED_IMAGE_TYPES
                : ALLOWED_VIDEO_TYPES
              ).join(",")}
              maxSize={
                adType === AdvertisementType.IMAGE_UPLOAD
                  ? MAX_IMAGE_BYTES
                  : MAX_VIDEO_BYTES
              }
              title={
                hasExistingUpload
                  ? "Arraste um novo arquivo para substituir"
                  : "Arraste o arquivo aqui"
              }
              upload={createUploadHandler((url) => {
                form.setValue("content_url", url);
                form.clearErrors("content_url");
              })}
              onFilesChange={trackUploads("content")}
              error={errors.content_url?.message}
            />
            {hasExistingUpload && (
              <p className="text-sm text-muted-foreground">
                Arquivo atual:{" "}
                <a
                  href={contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  abrir em nova aba
                </a>
              </p>
            )}
          </div>
        ) : (
          <Controller
            control={form.control}
            name="content_url"
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                type="url"
                label={
                  adType === AdvertisementType.EMBED_LINK
                    ? "Link do YouTube"
                    : "URL do conteúdo"
                }
                placeholder={
                  adType === AdvertisementType.EMBED_LINK
                    ? "https://www.youtube.com/watch?v=..."
                    : "https://..."
                }
                leftIcon={<Link2 />}
                required
                error={errors.content_url?.message}
              />
            )}
          />
        ))}

      {/* Capa: só para vídeos */}
      {isVideoType(adType) && (
        <Section title="Capa do vídeo (opcional)">
          <p className="-mt-2 text-sm text-muted-foreground">
            Aparece na listagem de anúncios. Envie uma imagem ou informe a URL.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUpload
              variant="compact"
              multiple={false}
              title="Enviar imagem"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              maxSize={MAX_IMAGE_BYTES}
              upload={createUploadHandler((url) => {
                form.setValue("thumbnail_url", url);
                form.clearErrors("thumbnail_url");
              })}
              onFilesChange={trackUploads("thumb")}
            />
            <Controller
              control={form.control}
              name="thumbnail_url"
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  type="url"
                  aria-label="URL da capa"
                  placeholder="ou cole a URL da imagem"
                  error={errors.thumbnail_url?.message}
                />
              )}
            />
          </div>
        </Section>
      )}

      <Section title="Onde e quando exibir">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <DatePicker
                label="Início"
                value={field.value}
                onValueChange={field.onChange}
                required
                error={errors.start_date?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <DatePicker
                label="Fim"
                value={field.value}
                onValueChange={field.onChange}
                min={startDate ?? undefined}
                hint="O anúncio fica no ar até o fim deste dia."
                required
                error={errors.end_date?.message}
              />
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="company_ids"
          render={({ field }) => (
            <MultiSelect
              label="Empresas"
              placeholder="Selecione as telas"
              options={companyOptions}
              value={field.value}
              onValueChange={field.onChange}
              searchable
              selectAll
              selectAllLabel="Todas as empresas"
              required
              error={errors.company_ids?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Switch
              checked={field.value === AdvertisementStatus.ACTIVE}
              onChange={(e) =>
                field.onChange(
                  e.target.checked
                    ? AdvertisementStatus.ACTIVE
                    : AdvertisementStatus.INACTIVE
                )
              }
              tone="success"
              label="Anúncio ativo"
              description="Desative para tirar o anúncio das telas sem excluí-lo."
            />
          )}
        />
      </Section>

      <Section title="Dias e horários">
        <Controller
          control={form.control}
          name="weekdays"
          render={({ field }) => {
            const selected = field.value ?? ALL_WEEKDAYS;
            const toggle = (day: number) =>
              field.onChange(
                selected.includes(day)
                  ? selected.filter((d) => d !== day)
                  : [...selected, day]
              );
            return (
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">
                  Dias da semana
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_BUTTONS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={selected.includes(day) ? "primary" : "secondary"}
                      aria-pressed={selected.includes(day)}
                      onClick={() => toggle(day)}
                      className="min-w-12"
                    >
                      {WEEKDAY_SHORT[day]}
                    </Button>
                  ))}
                </div>
                {errors.weekdays?.message && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.weekdays.message}
                  </p>
                )}
              </fieldset>
            );
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="daily_start"
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                type="time"
                label="Das"
                optional
                error={errors.daily_start?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="daily_end"
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                type="time"
                label="Até"
                optional
                error={errors.daily_end?.message}
              />
            )}
          />
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">
          {weeklySummary
            ? `Exibe só em: ${weeklySummary} (horário de Brasília).`
            : "Exibe todos os dias, o dia inteiro. Deixe os horários em branco para não limitar."}
        </p>
      </Section>

      <Section title="Texto sobre o anúncio (opcional)">
        <Controller
          control={form.control}
          name="overlay_text"
          render={({ field }) => (
            <Textarea
              {...field}
              value={field.value ?? ""}
              aria-label="Texto do overlay"
              placeholder="Mensagem exibida por cima do anúncio..."
              maxLength={200}
              showCount
            />
          )}
        />

        {overlayText && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="overlay_position"
                render={({ field }) => (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Posição</span>
                    <SegmentedControl
                      fullWidth
                      ariaLabel="Posição do texto"
                      value={field.value}
                      onValueChange={field.onChange}
                      items={[
                        { value: OverlayPosition.TOP, label: "Topo" },
                        { value: OverlayPosition.BOTTOM, label: "Rodapé" },
                      ]}
                    />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="overlay_bg_color"
                render={({ field }) => (
                  <ColorField
                    label="Cor do fundo"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="overlay_text_color"
                render={({ field }) => (
                  <ColorField
                    label="Cor do texto"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Prévia de como o texto aparece na tela */}
            <div
              className="relative flex aspect-[16/5] overflow-hidden rounded-[var(--lg-radius-lg)] bg-gradient-to-br from-slate-700 to-slate-900"
              style={{
                alignItems:
                  overlay[0] === OverlayPosition.TOP
                    ? "flex-start"
                    : "flex-end",
              }}
              aria-hidden="true"
            >
              <Clapperboard className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/30" />
              <div
                className="w-full px-3 py-2 text-center text-sm font-bold"
                style={{ background: overlay[1], color: overlay[2] }}
              >
                {overlayText}
              </div>
            </div>
          </>
        )}
      </Section>

      <Controller
        control={form.control}
        name="description"
        render={({ field }) => (
          <Textarea
            {...field}
            value={field.value ?? ""}
            label="Observações internas"
            optional
            hint="Não aparece na tela."
          />
        )}
      />

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={isSubmitting}
        disabled={isUploading}
      >
        {isUploading
          ? "Aguardando envio do arquivo..."
          : initialData && !duplicate
            ? "Salvar alterações"
            : "Criar anúncio"}
      </Button>
    </form>
  );
}
