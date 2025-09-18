// src/components/admin/advertisements/AdvertisementsCard.tsx
"use client";

import Image from "next/image";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Video,
} from "lucide-react";
import type { VariantProps } from "class-variance-authority";

// Tipos oficiais
import {
  Advertisement,
  AdvertisementStatus,
  AdvertisementType,
  Company,
} from "@/types";

// O client garante companies
type AdvertisementWithCompanies = Advertisement & { companies: Company[] };

interface AdvertisementsCardProps {
  anuncio: AdvertisementWithCompanies;
  onEdit: (anuncio: AdvertisementWithCompanies) => void;
  onDelete: (anuncio: AdvertisementWithCompanies) => void;
}

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const statusMap: Record<
  AdvertisementStatus,
  { text: string; variant: BadgeVariant }
> = {
  [AdvertisementStatus.ACTIVE]: { text: "Ativo", variant: "success" },
  [AdvertisementStatus.INACTIVE]: { text: "Inativo", variant: "destructive" },
};

/**
 * Extrai a thumbnail de um link do YouTube (se aplicável).
 */
function getYoutubeThumbnailUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;

    if (urlObj.hostname === "youtu.be") {
      videoId = urlObj.pathname.slice(1);
    } else if (
      urlObj.hostname === "www.youtube.com" ||
      urlObj.hostname === "youtube.com"
    ) {
      videoId = urlObj.searchParams.get("v");
    }

    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch (error) {
    console.error("URL de vídeo inválida:", error);
    return null;
  }
}

export function AdvertisementsCard({
  anuncio,
  onEdit,
  onDelete,
}: AdvertisementsCardProps) {
  const statusInfo = statusMap[anuncio.status];

  const renderPreview = () => {
    const isImageType =
      anuncio.type === AdvertisementType.IMAGE_LINK ||
      anuncio.type === AdvertisementType.IMAGE_UPLOAD;

    // 1) Imagem: usa a própria imagem do anúncio
    if (isImageType) {
      return (
        <Image
          src={anuncio.content_url}
          alt={`Preview do anúncio: ${anuncio.title}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      );
    }

    // 2) Não é imagem: se houver thumbnail_url, prioriza ela
    const hasThumb =
      typeof anuncio.thumbnail_url === "string" &&
      anuncio.thumbnail_url.trim().length > 0;

    if (hasThumb) {
      return (
        <Image
          src={anuncio.thumbnail_url as string}
          alt={`Thumbnail do anúncio: ${anuncio.title}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      );
    }

    // 3) Sem thumbnail_url: se for link/embed de YouTube, tenta extrair capa
    const youtubeThumbnail = getYoutubeThumbnailUrl(anuncio.content_url);
    if (youtubeThumbnail) {
      return (
        <Image
          src={youtubeThumbnail}
          alt={`Thumbnail do vídeo: ${anuncio.title}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      );
    }

    // 4) Fallback padrão: ícone de vídeo/câmera
    return (
      <div className="w-full h-full bg-secondary flex items-center justify-center">
        <Video className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="aspect-video relative group bg-muted">
          {renderPreview()}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="icon" variant="secondary">
              <Eye className="h-5 w-5" />
              <span className="sr-only">Ver preview</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            <CardTitle className="text-lg leading-tight mb-1">
              {anuncio.title}
            </CardTitle>
            <Badge variant={statusInfo.variant} className="capitalize">
              {statusInfo.text}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="h-5 w-5" />
                <span className="sr-only">Abrir menu de ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(anuncio)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDelete(anuncio)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto space-y-3 text-sm text-muted-foreground pt-4">
          <div className="flex items-start gap-2">
            <Building className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {anuncio.companies?.map((empresa) => (
                <Badge key={empresa.id} variant="outline">
                  {empresa.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              Válido até{" "}
              {new Date(anuncio.end_date).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
