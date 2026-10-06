// src/app/loading.tsx
import { Loading } from "@/components/ui/Loading/Loading";

export default function RootLoading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Loading size="lg" label="Carregando..." labelPlacement="bottom" />
    </div>
  );
}
