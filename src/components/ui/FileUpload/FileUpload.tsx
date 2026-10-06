"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { AlertCircleIcon, CheckCircleIcon, CloseIcon } from "../_internal/icons";
import { Field, fieldMessageId, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./FileUpload.module.css";

export type UploadStatus = "pending" | "uploading" | "done" | "error";

export type UploadFile = {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–100 */
  progress: number;
  error?: string;
  /** URL temporária para miniatura (imagens) */
  previewUrl?: string;
  /** Recusado na validação (tipo, tamanho, limite) — não pode reenviar */
  rejected?: boolean;
};

export type UploadHandler = (
  file: File,
  helpers: { onProgress: (percent: number) => void; signal: AbortSignal },
) => Promise<unknown>;

export type FileUploadProps = FieldStatusProps & {
  label?: ReactNode;
  /** Igual ao atributo accept do input: "image/*,.pdf" */
  accept?: string;
  multiple?: boolean;
  /** Tamanho máximo por arquivo (bytes) */
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  /** Se informado, cada arquivo válido é enviado automaticamente */
  upload?: UploadHandler;
  /** Lista atual (inclui status). Útil para habilitar o "Salvar" do formulário. */
  onFilesChange?: (files: UploadFile[]) => void;
  /** "dropzone" (área grande) ou "compact" (botão + lista) */
  variant?: "dropzone" | "compact";
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Gera miniaturas para imagens. Padrão: true */
  previews?: boolean;
  className?: string;
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[i]}`;
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  const rules = accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) =>
    rule.startsWith(".") ? name.endsWith(rule) : rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : type === rule,
  );
}

const UploadIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M20 16.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5" />
  </svg>
);

function FileTypeIcon({ file }: { file: File }) {
  const ext = file.name.split(".").pop()?.toUpperCase().slice(0, 4) ?? "";
  return (
    <span className={styles.typeIcon} data-kind={file.type.split("/")[0]}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      {ext && <span className={styles.ext}>{ext}</span>}
    </span>
  );
}

let seq = 0;

export function FileUpload({
  label,
  accept,
  multiple = true,
  maxSize,
  maxFiles,
  disabled,
  upload,
  onFilesChange,
  variant = "dropzone",
  title = "Arraste arquivos aqui",
  description,
  icon,
  previews = true,
  hint,
  error,
  success,
  className,
}: FileUploadProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());
  const { invalid, hasMessage } = resolveStatus({ error, success, hint });

  const onChangeRef = useRef(onFilesChange);
  useEffect(() => {
    onChangeRef.current = onFilesChange;
  });
  useEffect(() => {
    onChangeRef.current?.(files);
  }, [files]);

  // Libera URLs de preview e cancela envios ao desmontar
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  });
  useEffect(
    () => () => {
      filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      controllers.current.forEach((c) => c.abort());
    },
    [],
  );

  const patch = (fileId: string, data: Partial<UploadFile>) =>
    setFiles((list) => list.map((f) => (f.id === fileId ? { ...f, ...data } : f)));

  const startUpload = async (item: UploadFile) => {
    if (!upload) return;
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      await upload(item.file, {
        signal: controller.signal,
        onProgress: (p) => patch(item.id, { progress: Math.max(0, Math.min(100, Math.round(p))) }),
      });
      if (!controller.signal.aborted) patch(item.id, { status: "done", progress: 100 });
    } catch (err) {
      if (controller.signal.aborted) return;
      patch(item.id, { status: "error", error: err instanceof Error ? err.message : "Falha no envio" });
    } finally {
      controllers.current.delete(item.id);
    }
  };

  const addFiles = (list: FileList | File[]) => {
    if (disabled) return;
    const incoming = Array.from(list);
    const room = maxFiles ? Math.max(0, maxFiles - files.length) : Infinity;
    const accepted = multiple ? incoming : incoming.slice(0, 1);

    const items: UploadFile[] = accepted.map((file, index) => {
      let problem: string | undefined;
      if (!matchesAccept(file, accept)) problem = "Tipo de arquivo não permitido";
      else if (maxSize && file.size > maxSize) problem = `Maior que ${formatBytes(maxSize)}`;
      else if (index >= room) problem = `Limite de ${maxFiles} arquivo${maxFiles === 1 ? "" : "s"}`;
      return {
        id: `f${++seq}`,
        file,
        status: problem ? "error" : upload ? "uploading" : "pending",
        progress: 0,
        error: problem,
        rejected: Boolean(problem),
        previewUrl: !problem && previews && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };
    });

    if (!multiple) filesRef.current.forEach((f) => remove(f.id, true));
    setFiles((current) => (multiple ? [...current, ...items] : items));
    items.filter((i) => !i.error).forEach(startUpload);
  };

  const remove = (fileId: string, silent = false) => {
    controllers.current.get(fileId)?.abort();
    const target = filesRef.current.find((f) => f.id === fileId);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    if (!silent) setFiles((list) => list.filter((f) => f.id !== fileId));
  };

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const constraints = [
    accept && accept.replace(/\s/g, "").split(",").join(", "),
    maxSize && `até ${formatBytes(maxSize)}`,
    maxFiles && `máx. ${maxFiles} arquivo${maxFiles === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Field id={id} label={label} hint={hint} error={error} success={success} className={className}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="lg-sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
        aria-label={typeof title === "string" ? `${title}. Ou clique para escolher` : "Escolher arquivos"}
        className={cx(styles.zone, variant === "compact" && styles.compact)}
        data-dragging={dragging}
        data-invalid={invalid}
        data-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className={styles.zoneIcon}>{icon ?? <UploadIcon />}</span>
        <span className={styles.zoneText}>
          <span className={styles.zoneTitle}>
            {dragging ? "Solte para enviar" : title}
            {variant === "dropzone" && !dragging && (
              <>
                {" "}
                ou <span className={styles.browse}>escolha</span>
              </>
            )}
          </span>
          {(description || constraints) && <span className={styles.zoneDescription}>{description ?? constraints}</span>}
        </span>
        {variant === "compact" && <span className={styles.compactButton}>Escolher</span>}
      </div>

      {files.length > 0 && (
        <ul role="list" className={styles.list} aria-live="polite">
          {files.map((f) => (
            <li key={f.id} className={styles.file} data-status={f.status}>
              {f.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.previewUrl} alt="" className={styles.thumb} />
              ) : (
                <FileTypeIcon file={f.file} />
              )}
              <div className={styles.fileBody}>
                <div className={styles.fileRow}>
                  <span className={styles.fileName} title={f.file.name}>
                    {f.file.name}
                  </span>
                  <span className={styles.fileStatus}>
                    {f.status === "done" && <CheckCircleIcon size={16} />}
                    {f.status === "error" && <AlertCircleIcon size={16} />}
                    {f.status === "uploading" && `${f.progress}%`}
                  </span>
                </div>
                <div className={styles.fileMeta}>
                  {f.status === "error" ? (
                    <span className={styles.fileError}>{f.error}</span>
                  ) : (
                    <span>
                      {formatBytes(f.file.size)}
                      {f.status === "done" && " · Enviado"}
                      {f.status === "pending" && " · Pronto"}
                    </span>
                  )}
                  {f.status === "error" && upload && !f.rejected && (
                    <button type="button" className={styles.retry} onClick={() => startUpload(f)}>
                      Tentar novamente
                    </button>
                  )}
                </div>
                {f.status === "uploading" && (
                  <div
                    className={styles.progress}
                    role="progressbar"
                    aria-valuenow={f.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Enviando ${f.file.name}`}
                  >
                    <span style={{ transform: `scaleX(${f.progress / 100})` }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(f.id)}
                aria-label={f.status === "uploading" ? `Cancelar ${f.file.name}` : `Remover ${f.file.name}`}
              >
                <CloseIcon size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
