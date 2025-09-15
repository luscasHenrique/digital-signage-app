// src/app/(admin)/dashboard/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo!</CardTitle>
          <CardDescription>
            Este é o seu painel de gerenciamento de Digital Signage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Utilize o menu à esquerda para navegar entre as seções e gerenciar
            seus anúncios e empresas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
