// src/components/admin/advertisements/AdvertisementsClient.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutGrid, List, PlusCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

// Importando os tipos oficiais
import { Advertisement, Company } from "@/types";

// Importando os componentes filhos
import { deleteAdvertisement } from "@/actions/advertisements";
import { AdvertisementForm } from "./AdvertisementForm";
import { AdvertisementsCard } from "./AdvertisementsCard";
import { columns } from "./AdvertisementsColumns";
import { DataTable } from "./AdvertisementsDataTable";

// O tipo de dado esperado por este componente cliente.
// Geralmente, os dados vêm de uma query com JOIN, garantindo que 'companies' seja um array.
export type AdvertisementWithCompanies = Advertisement & {
  companies: Company[];
};

interface AdvertisementsClientProps {
  initialAdvertisements: AdvertisementWithCompanies[];
  companies: Company[];
}

export function AdvertisementsClient({
  initialAdvertisements,
  companies,
}: AdvertisementsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState<AdvertisementWithCompanies | null>(
    null
  );
  const [adToDelete, setAdToDelete] =
    useState<AdvertisementWithCompanies | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  // Estado para controlar a visualização (grade ou tabela), iniciando com grade
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Abre o modal de edição/criação
  const handleOpenModal = (ad: AdvertisementWithCompanies | null) => {
    setCurrentAd(ad);
    setIsModalOpen(true);
  };

  // Fecha o modal de edição/criação
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAd(null);
  };

  // Abre o diálogo de confirmação para exclusão
  const handleOpenDeleteDialog = (ad: AdvertisementWithCompanies) => {
    setAdToDelete(ad);
  };

  // Executa a ação de deletar o anúncio
  const handleDeleteAd = () => {
    if (!adToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteAdvertisement(adToDelete.id);
      if (result.success) {
        toast.success(result.message || "Anúncio excluído com sucesso!");
      } else {
        toast.error(result.message || "Erro ao excluir o anúncio.");
      }
      setAdToDelete(null);
    });
  };

  return (
    <>
      {/* Cabeçalho com Seletor de View e Botão de Adicionar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="Visualizar em grade"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
            aria-label="Visualizar em tabela"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Anúncio
        </Button>
      </div>

      {/* Renderização Condicional: Grade de Cards ou Tabela */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {initialAdvertisements.map((ad) => (
            <AdvertisementsCard
              key={ad.id}
              anuncio={ad}
              onEdit={handleOpenModal}
              onDelete={handleOpenDeleteDialog}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns({
            onEdit: handleOpenModal,
            onDelete: handleOpenDeleteDialog,
          })}
          data={initialAdvertisements}
        />
      )}

      {/* Modal para Criar/Editar Anúncio */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentAd ? "Editar Anúncio" : "Criar Novo Anúncio"}
            </DialogTitle>
            <DialogDescription>
              {currentAd
                ? "Atualize os dados do anúncio."
                : "Preencha os dados para criar um novo anúncio."}
            </DialogDescription>
          </DialogHeader>
          <AdvertisementForm
            initialData={currentAd}
            companies={companies}
            onSuccess={handleCloseModal}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Excluir Anúncio */}
      <AlertDialog open={!!adToDelete} onOpenChange={() => setAdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              anúncio <span className="font-bold">{adToDelete?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAd}
              disabled={isDeletePending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletePending ? "Excluindo..." : "Sim, excluir anúncio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
