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
import { PlusCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Advertisement, Company } from "@/types";
import { AdvertisementForm } from "./AdvertisementForm";
import { DataTable } from "./AdvertisementsDataTable";
import { columns } from "./AdvertisementsColumns";
import { deleteAdvertisement } from "@/actions/advertisements";
import { toast } from "sonner";

export type AdvertisementWithCompanies = Advertisement & {
  companies: Pick<Company, "id" | "name">[];
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

  const handleOpenModal = (ad: AdvertisementWithCompanies | null) => {
    setCurrentAd(ad);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAd(null);
  };

  const handleOpenDeleteDialog = (ad: AdvertisementWithCompanies) => {
    setAdToDelete(ad);
  };

  const handleDeleteAd = () => {
    if (!adToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteAdvertisement(adToDelete.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setAdToDelete(null);
    });
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Anúncio
        </Button>
      </div>

      <DataTable
        columns={columns({
          onEdit: handleOpenModal,
          onDelete: handleOpenDeleteDialog,
        })}
        data={initialAdvertisements}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {/* MELHORIA APLICADA AQUI */}
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
