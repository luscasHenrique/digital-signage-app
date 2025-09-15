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

// Importando os tipos oficiais do seu projeto
import {
  Advertisement,
  AdvertisementStatus,
  AdvertisementType,
  Company,
} from "@/types";

// Tipo que corresponde exatamente ao que o AdvertisementsClient envia (com 'companies' garantido)
type AdvertisementWithCompanies = Advertisement & { companies: Company[] };

// Props que o componente de card vai receber
interface AdvertisementsCardProps {
  anuncio: AdvertisementWithCompanies;
  onEdit: (anuncio: AdvertisementWithCompanies) => void;
  onDelete: (anuncio: AdvertisementWithCompanies) => void;
}

// Criando um tipo seguro para as variantes do Badge
type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

// Mapeamento do Enum de Status para o texto e estilo que serão exibidos
const statusMap: Record<
  AdvertisementStatus,
  { text: string; variant: BadgeVariant }
> = {
  [AdvertisementStatus.ACTIVE]: { text: "Ativo", variant: "default" },
  [AdvertisementStatus.INACTIVE]: { text: "Inativo", variant: "destructive" },
};

/**
 * Função auxiliar que extrai a URL da thumbnail de um vídeo do YouTube.
 * @param url A URL do vídeo do YouTube.
 * @returns A URL da imagem da thumbnail ou null se a URL for inválida.
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

  // Função interna para renderizar o conteúdo do preview de forma condicional
  const renderPreview = () => {
    const isImageType =
      anuncio.type === AdvertisementType.IMAGE_LINK ||
      anuncio.type === AdvertisementType.IMAGE_UPLOAD;

    // Se for um tipo de imagem, renderiza o componente Image com a URL direta.
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

    // Se não for imagem, tenta obter a thumbnail do YouTube.
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

    // Caso não seja imagem nem um link de YouTube válido, mostra um ícone de fallback.
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
