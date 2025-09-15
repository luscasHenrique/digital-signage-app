// src/components/admin/users/UsersClient.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PlusCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { DataTable } from "./UsersDataTable";
import { columns } from "./UsersColumns";
import { UserForm } from "./UserForm";
import { deleteUser } from "@/actions/users";
// Importa o tipo centralizado, que agora é a única fonte da verdade.
import { UserWithProfile } from "@/types";
import { toast } from "sonner";

interface UsersClientProps {
  users: UserWithProfile[];
}

export function UsersClient({ users }: UsersClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithProfile | null>(null);

  // 4. Estados para o diálogo de exclusão
  const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(
    null
  );
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleOpenModal = (user: UserWithProfile | null) => {
    setCurrentUser(user);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  // 5. Função para abrir o diálogo de confirmação
  const handleOpenDeleteDialog = (user: UserWithProfile) => {
    setUserToDelete(user);
  };

  // 6. Função para executar a exclusão
  const handleDeleteUser = () => {
    if (!userToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteUser(userToDelete.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setUserToDelete(null); // Fecha o diálogo
    });
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenModal(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      <DataTable
        columns={columns({
          onEdit: (user) => handleOpenModal(user),
          onDelete: handleOpenDeleteDialog, // 7. Passar a função para a tabela
        })}
        data={users}
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentUser ? "Editar Usuário" : "Criar Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {currentUser
                ? "Atualize os dados do usuário."
                : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>
          <UserForm initialData={currentUser} onSuccess={handleCloseModal} />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={() => setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              usuário <span className="font-bold">{userToDelete?.email}</span> e
              todos os seus dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletePending}
            >
              {isDeletePending ? "Excluindo..." : "Sim, excluir usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
