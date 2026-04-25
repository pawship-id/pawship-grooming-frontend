"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Users, Package, Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getUsers } from "@/lib/api/users";
import { getPets } from "@/lib/api/pets";
import { getAdminServices } from "@/lib/api/services";

const stats = [
  {
    key: "customers" as const,
    title: "Total Customer",
    icon: Users,
    color: "text-primary",
  },
  {
    key: "pets" as const,
    title: "Total Pet",
    icon: Package,
    color: "text-primary",
  },
  {
    key: "services" as const,
    title: "Services",
    icon: Package,
    color: "text-accent-foreground",
  },
  {
    key: "groomers" as const,
    title: "Groomers",
    icon: Scissors,
    color: "text-secondary-foreground",
  },
];

export function DashboardStatCards() {
  const [counts, setCounts] = useState({
    customers: 0,
    pets: 0,
    services: 0,
    groomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsers({ page: 1, limit: 1, role: "customer", is_active: "true" }),
      getPets({ page: 1, limit: 1, is_active: "true" }),
      getAdminServices({ page: 1, limit: 1, is_active: "true" }),
      getUsers({ page: 1, limit: 1, role: "groomer", is_active: "true" }),
    ])
      .then(([customersRes, petsRes, servicesRes, groomersRes]) => {
        setCounts({
          customers: customersRes.pagination?.total ?? 0,
          pets: petsRes.pagination?.total ?? 0,
          services: servicesRes.pagination?.total ?? 0,
          groomers: groomersRes.pagination?.total ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.key} className="border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              {loading ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <p className="font-display text-2xl font-bold text-foreground">
                  {counts[stat.key]}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
