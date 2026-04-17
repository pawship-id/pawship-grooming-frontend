/**
 * Shared component prop types used across booking pages
 * for pricing display, benefit selection, and promotion selection.
 *
 * These are "view-model" types — normalized from both admin and public API types
 * so that shared UI components can work with a single interface.
 */

// ── Pricing Display Types ────────────────────────────────────────────────────

export interface PricingServiceRow {
  id: string;
  name: string;
  originalPrice: number;
  finalPrice: number;
  /** "quota" = Gratis (blue), "discount" = -X% (green), undefined = no benefit */
  benefitType?: "quota" | "discount";
  benefitValue?: number;
  /** Whether an admin manually edited this price */
  adminEdited?: boolean;
}

export interface PricingAddonRow {
  id: string;
  name: string;
  originalPrice: number;
  finalPrice: number;
  benefitType?: "quota" | "discount";
  benefitValue?: number;
  adminEdited?: boolean;
}

export interface PricingFeeRow {
  type: "pickup" | "delivery" | "travel";
  label: string;
  originalPrice: number;
  finalPrice: number;
  benefitApplied?: boolean;
  adminEdited?: boolean;
}

export interface BenefitDiscountRow {
  label: string;
  appliesToName: string;
  type: "quota" | "discount";
  amountDeducted: number;
}

export interface PromoDiscountRow {
  code: string;
  name: string;
  appliesToName: string;
  amountDeducted: number;
}

export interface AdminDiscountRow {
  itemName: string;
  originalPrice: number;
  editedPrice: number;
  discountAmount: number;
}

export interface PricingBreakdownData {
  service: PricingServiceRow;
  addons: PricingAddonRow[];
  fees: PricingFeeRow[];
  subtotal: number;
  grandTotal: number;

  benefitDiscounts: BenefitDiscountRow[];
  benefitTotalDiscount: number;

  promoDiscounts: PromoDiscountRow[];
  promoTotalDiscount: number;

  adminDiscounts?: AdminDiscountRow[];
  adminTotalDiscount?: number;

  finalPrice: number;
}

// ── Benefit / Promotion Selection Types ──────────────────────────────────────

export interface SelectableBenefit {
  _id: string;
  label?: string;
  applies_to: string;
  service_id?: string;
  serviceName?: string;
  type: string; // "discount" | "quota"
  period: string; // "weekly" | "monthly" | "unlimited"
  value?: number;
  limit: number | null;
  used: number;
  remaining: number | null;
  can_apply: boolean;
  amount_discount?: number;
  description: string;
}

export interface SelectablePromotion {
  _id: string;
  code: string;
  name: string;
  description: string | null;
  applies_to: string;
  service_id: string | null;
  service_name: string | null;
  discount_type: string;
  value: number;
  is_stackable: boolean;
  is_available_to_membership: boolean;
  amount_discount: number;
}
