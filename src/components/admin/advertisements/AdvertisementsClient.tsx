// src/components/admin/advertisements/AdvertisementsClient.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Advertisement, Company } from "@/types";
import { AdvertisementForm } from "./AdvertisementForm"; // 1. Importar o formulário

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

  const handleOpenModal = (ad: AdvertisementWithCompanies | null) => {
    setCurrentAd(ad);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAd(null);
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Anúncio
        </Button>
      </div>

      {/* A tabela entrará aqui em breve */}
      <div className="rounded-md border p-4">
        <p className="text-center text-muted-foreground">
          A tabela de anúncios será implementada aqui.
        </p>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {/* Aumentamos o tamanho do modal para o formulário caber melhor */}
        <DialogContent className="max-w-3xl">
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
          {/* 2. Usar o componente de formulário */}
          <AdvertisementForm
            initialData={currentAd}
            companies={companies}
            onSuccess={handleCloseModal}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
