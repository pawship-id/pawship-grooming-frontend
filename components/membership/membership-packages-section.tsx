"use client";

import {
  CheckCircle2,
  Crown,
  Download,
  MessageCircle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WHATSAPP_NUMBER, WA_RECOMMEND } from "./constants";
import { formatPrice } from "@/lib/format";
import type { PublicMembershipPlan } from "@/lib/api/memberships";

interface Props {
  plans: PublicMembershipPlan[];
}

export function MembershipPackagesSection({ plans }: Props) {
  return (
    <section id="paket" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Pilihan Paket
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Start Your Pet&apos;s Care Journey with Us!
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tersedia dalam <strong>6 &amp; 12 Bulan</strong> &mdash; Slot
            Terbatas!
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Paket membership akan segera tersedia.
          </p>
        ) : (
          <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-end">
            {plans.map((plan) => (
              <PricingCard key={plan._id} plan={plan} />
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          *SnK berlaku. Hubungi admin untuk detail lengkap.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 shadow-lg shadow-primary/25"
          >
            <a href={WA_RECOMMEND} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Tanya Admin untuk Rekomendasi Paket
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full px-8"
          >
            <a href="#" onClick={(e) => e.preventDefault()}>
              <Download className="mr-2 h-4 w-4" />
              Download Pricelist
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────

function PricingCard({ plan }: { plan: PublicMembershipPlan }) {
  const isFeatured = plan.featured;
  const isPremium = plan.badge_variant === "premium";
  const hasStrikethrough =
    plan.original_price != null && plan.original_price > plan.price;

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col rounded-2xl border p-7 transition-all",
        isFeatured
          ? "scale-[1.03] border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/25 lg:scale-[1.06]"
          : "border-border/60 bg-card shadow-sm hover:shadow-md",
      )}
    >
      {/* Badge */}
      {plan.badge_label && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold shadow-md",
            isFeatured
              ? "bg-yellow-400 text-yellow-900"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {isPremium ? (
            <Crown className="mr-1 inline-block h-3 w-3" />
          ) : (
            <Star className="mr-1 inline-block h-3 w-3" />
          )}
          {plan.badge_label}
        </div>
      )}

      {/* Header */}
      <div className="mb-4 mt-3">
        <h3
          className={cn(
            "font-display text-2xl font-extrabold",
            isFeatured ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {plan.name}
        </h3>
        {plan.description && (
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              isFeatured
                ? "text-primary-foreground/80"
                : "text-muted-foreground",
            )}
          >
            {plan.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mb-6">
        {hasStrikethrough && (
          <p
            className={cn(
              "text-sm line-through",
              isFeatured
                ? "text-primary-foreground/60"
                : "text-muted-foreground",
            )}
          >
            {formatPrice(plan.original_price!)}
          </p>
        )}
        <p
          className={cn(
            "text-3xl font-extrabold",
            isFeatured ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {formatPrice(plan.price)}
          <span
            className={cn(
              "ml-1 text-sm font-medium",
              isFeatured
                ? "text-primary-foreground/70"
                : "text-muted-foreground",
            )}
          >
            / {plan.duration_months} bln
          </span>
        </p>
      </div>

      {/* Benefits */}
      {plan.display_benefits.length > 0 && (
        <ul className="flex flex-1 flex-col gap-3">
          {plan.display_benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  isFeatured ? "text-white" : "text-primary",
                )}
              />
              <span
                className={cn(
                  isFeatured ? "text-primary-foreground" : "text-foreground",
                )}
              >
                {b}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <div className="mt-8">
        <Button
          asChild
          size="sm"
          className={cn(
            "w-full rounded-full",
            isFeatured
              ? "bg-white text-primary hover:bg-white/90"
              : "bg-primary text-primary-foreground",
          )}
        >
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              `Halo Pawship! Saya tertarik dengan paket ${plan.name} Membership 🐾`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pilih {plan.name}
          </a>
        </Button>
      </div>
    </div>
  );
}

