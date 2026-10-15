// src/components/admin/users/DeleteUserDialog.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { countUserAdvertisements, deleteUser } from "@/actions/users";
import { Button } from "@/components/ui/Button/Button";
import { Dialog } from "@/components/ui/Dialog/Dialog";
import { Radio, RadioGroup } from "@/components/ui/Radio/Radio";
import { Select } from "@/components/ui/Select/Select";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useToast } from "@/components/ui/Toast/Toast";
import type { UserWithProfile } from "@/types";

type AdsDestination = "none" | "transfer";

/**
 * Confirma a exclusão de um usuário. Se ele criou anúncios, o admin escolhe
 * entre deixá-los sem autor ou transferi-los para outro usuário.
 */
export function DeleteUserDialog({
  user,
  users,
  onClose,
}: {
  user: UserWithProfile | null;
  users: UserWithProfile[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  // null = carregando; undefined = não foi possível contar
  const [adsCount, setAdsCount] = useState<number | null | undefined>(null);
  const [destination, setDestination] = useState<AdsDestination>("none");
  const [transferToId, setTransferToId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setAdsCount(null);
    setDestination("none");
    setTransferToId(null);
    countUserAdvertisements(user.id).then((count) => {
      if (!cancelled) setAdsCount(count ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const transferOptions = users
    .filter((u) => u.id !== user?.id)
    .map((u) => ({
      value: u.id,
      label: u.full_name || u.email || "Sem nome",
      description: u.full_name ? (u.email ?? undefined) : undefined,
    }));

  const hasAds = adsCount !== null && adsCount !== 0;
  const isTransfer = hasAds && destination === "transfer";
  const canConfirm =
    adsCount !== null && !isPending && (!isTransfer || !!transferToId);

  const handleConfirm = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await deleteUser(
        user.id,
        isTransfer ? transferToId : null
      );
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => !open && !isPending && onClose()}
      role="alertdialog"
      size="sm"
      icon={<Trash2 />}
      title="Excluir usuário?"
      description={
        <>
          O usuário <strong>{user?.email}</strong> perderá o acesso ao painel.
          Esta ação não pode ser desfeita.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isPending}
            disabled={!canConfirm}
          >
            Excluir usuário
          </Button>
        </>
      }
    >
      {adsCount === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Verificando anúncios do usuário...
        </div>
      ) : hasAds ? (
        <div className="flex flex-col gap-3">
          <RadioGroup
            label={
              adsCount === undefined
                ? "O que fazer com os anúncios criados por ele?"
                : `Ele criou ${adsCount} ${
                    adsCount === 1 ? "anúncio" : "anúncios"
                  }. O que fazer com eles?`
            }
            value={destination}
            onValueChange={(v) => setDestination(v as AdsDestination)}
            disabled={isPending}
          >
            <Radio
              value="none"
              label="Deixar sem autor"
              description="Os anúncios continuam no ar, sem autor definido."
            />
            <Radio
              value="transfer"
              label="Transferir para outro usuário"
              description="O usuário escolhido passa a ser o autor."
            />
          </RadioGroup>

          {destination === "transfer" && (
            <Select
              label="Novo autor"
              placeholder="Escolha um usuário"
              options={transferOptions}
              value={transferToId}
              onValueChange={setTransferToId}
              searchable
              disabled={isPending}
              required
            />
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
