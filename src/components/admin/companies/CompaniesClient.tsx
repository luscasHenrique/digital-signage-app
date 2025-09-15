// src/components/admin/companies/CompaniesClient.tsx
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
import { useState, useTransition } from "react";
import { Company } from "@/types";
import { DataTable } from "./CompaniesDataTable";
import { columns } from "./CompaniesColumns";
import { CompanyForm } from "./CompanyForm";
// 1. Importar o diálogo de alerta e a action
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
import { deleteCompany } from "@/actions/companies";
import { toast } from "sonner";

interface CompaniesClientProps {
  companies: Company[];
}

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // 2. Estados para o diálogo de exclusão
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleOpenModal = (company: Company | null) => {
    setCurrentCompany(company);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  // 3. Função para abrir o diálogo de confirmação
  const handleOpenDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
  };

  // 4. Função para executar a exclusão
  const handleDeleteCompany = () => {
    if (!companyToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteCompany(companyToDelete.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setCompanyToDelete(null); // Fecha o diálogo
    });
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Empresa
        </Button>
      </div>

      <DataTable
        columns={columns({
          onEdit: handleOpenModal,
          onDelete: handleOpenDeleteDialog, // 5. Passar a função para a tabela
        })}
        data={companies}
      />

      {/* Modal de Criar/Editar Empresa */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCompany ? "Editar Empresa" : "Criar Nova Empresa"}
            </DialogTitle>
            <DialogDescription>
              {currentCompany
                ? "Atualize os dados da empresa."
                : "Preencha os dados para criar uma nova empresa."}
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            initialData={currentCompany}
            onSuccess={handleCloseModal}
          />
        </DialogContent>
      </Dialog>

      {/* 6. Diálogo de Confirmação de Exclusão */}
      <AlertDialog
        open={!!companyToDelete}
        onOpenChange={() => setCompanyToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              empresa <span className="font-bold">{companyToDelete?.name}</span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              disabled={isDeletePending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletePending ? "Excluindo..." : "Sim, excluir empresa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
