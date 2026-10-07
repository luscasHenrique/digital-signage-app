// src/app/(admin)/dashboard/page.tsx
import { Building2, Megaphone, MonitorPlay, PlayCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card/Card";
import { ONLINE_THRESHOLD_MS } from "@/lib/display/status";
import { createClient } from "@/lib/supabase/server";
import { AdvertisementStatus } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

async function getStats() {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

  const [ads, activeAds, companies, online] = await Promise.all([
    supabase
      .from("advertisements")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("advertisements")
      .select("id", { count: "exact", head: true })
      .eq("status", AdvertisementStatus.ACTIVE)
      .lte("start_date", nowIso)
      .gte("end_date", nowIso),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase
      .from("display_heartbeats")
      .select("company_id", { count: "exact", head: true })
      .gte("last_seen_at", onlineSince),
  ]);

  return {
    ads: ads.count ?? 0,
    activeAds: activeAds.count ?? 0,
    companies: companies.count ?? 0,
    online: online.count ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "No ar agora",
      value: stats.activeAds,
      hint: "Anúncios ativos dentro do período",
      icon: <PlayCircle />,
      href: "/dashboard/anuncios",
    },
    {
      label: "Anúncios",
      value: stats.ads,
      hint: "Total cadastrado",
      icon: <Megaphone />,
      href: "/dashboard/anuncios",
    },
    {
      label: "Telas no ar",
      value: `${stats.online}/${stats.companies}`,
      hint: "Displays com contato nos últimos 2 min",
      icon: <MonitorPlay />,
      href: "/dashboard/empresas",
    },
    {
      label: "Empresas",
      value: stats.companies,
      hint: "Telas de exibição",
      icon: <Building2 />,
      href: "/dashboard/empresas",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumo do conteúdo exibido nas suas telas."
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="block">
            <Card interactive radius="lg" className="flex flex-col gap-1.5">
              <span className="mb-1.5 grid size-[38px] place-items-center rounded-[12px] bg-accent-soft text-primary [&_svg]:size-[19px]">
                {card.icon}
              </span>
              <span className="text-sm text-muted-foreground">
                {card.label}
              </span>
              <strong className="text-[length:var(--lg-text-2xl)] tracking-[var(--lg-tracking-tight)]">
                {card.value}
              </strong>
              <span className="text-xs text-subtle-foreground">
                {card.hint}
              </span>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
