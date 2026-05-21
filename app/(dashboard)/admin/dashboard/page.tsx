"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardFiltersProvider } from "@/hooks/use-dashboard-filters";
import { DailyCapacitySection } from "@/components/admin/dashboard/daily-capacity-section";
import { NeedsActionSection } from "@/components/admin/dashboard/needs-action-section";
import { RevenueSection } from "@/components/admin/dashboard/revenue-section";
import { BookingsSection } from "@/components/admin/dashboard/bookings-section";
import { CapacitySection } from "@/components/admin/dashboard/capacity-section";
import { GroomerPerformanceSection } from "@/components/admin/dashboard/groomer-performance-section";
import { ActivityFeedSection } from "@/components/admin/dashboard/activity-feed-section";
import { MembershipHealthSection } from "@/components/admin/dashboard/membership-health-section";
import { GrowthSection } from "@/components/admin/dashboard/growth-section";
import { DashboardFilterBar } from "@/components/admin/dashboard/filters/dashboard-filter-bar";

export default function AdminDashboard() {
  return (
    <DashboardFiltersProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selamat datang di panel admin Pawship Grooming
          </p>
        </div>

        <Tabs defaultValue="ringkasan">
          <div className="sticky top-14 md:top-0 z-30 -mx-6 px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-border/50">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <TabsList className="flex-wrap justify-start">
                <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
                <TabsTrigger value="operasional">Operasional</TabsTrigger>
                <TabsTrigger value="pertumbuhan">Pertumbuhan</TabsTrigger>
              </TabsList>
              <DashboardFilterBar />
            </div>
          </div>

          <TabsContent
            value="ringkasan"
            className="!mt-4 flex flex-col gap-4 data-[state=inactive]:!mt-0"
          >
            <NeedsActionSection />
            <RevenueSection />
            <BookingsSection />
          </TabsContent>

          <TabsContent
            value="operasional"
            className="!mt-4 flex flex-col gap-4 data-[state=inactive]:!mt-0"
          >
            <CapacitySection />
            <DailyCapacitySection />
            <GroomerPerformanceSection />
            <ActivityFeedSection />
          </TabsContent>

          <TabsContent
            value="pertumbuhan"
            className="!mt-4 flex flex-col gap-4 data-[state=inactive]:!mt-0"
          >
            <MembershipHealthSection />
            <GrowthSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardFiltersProvider>
  );
}
