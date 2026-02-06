// ==========================================
// PAWship Pet Grooming - Type Definitions
// ==========================================

// --- Auth ---
export type UserRole = "admin" | "groomer"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

// --- Customer ---
export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  area: string
  loyaltyPoints: number
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum"
  notes: string
  createdAt: string
  pets: Pet[]
}

// --- Pet ---
export type PetType = "dog" | "cat" | "other"
export type SizeCategory = "small" | "medium" | "large" | "extra-large"
export type MembershipTier = "basic" | "premium" | "vip"
export type MembershipStatus = "active" | "expired" | "cancelled"

export interface Pet {
  id: string
  customerId: string
  type: PetType
  name: string
  breed: string
  birthday: string
  weight: number
  sizeCategory: SizeCategory
  notes: string
  tags: string[]
  membershipTier: MembershipTier
  membershipStatus: MembershipStatus
  membershipStart: string
  membershipEnd: string
}

// --- Product / Service ---
export interface Product {
  id: string
  name: string
  description: string
  category: "grooming" | "addon" | "spa" | "medical"
  price: number
  duration: number // in minutes
  petTypes: PetType[]
  isActive: boolean
  image: string
}

// --- Groomer ---
export interface Groomer {
  id: string
  name: string
  email: string
  phone: string
  specialties: string[]
  isActive: boolean
  avatar: string
}

// --- Booking ---
export type BookingType = "in-store" | "home"
export type BookingStatus = "confirmed" | "not-confirmed" | "cancelled" | "in-progress" | "completed"
export type JobStatus = "pending" | "started" | "finished"

export interface BookingMedia {
  id: string
  url: string
  type: "before" | "after"
  uploadedAt: string
}

export interface PreCondition {
  id: string
  description: string
  flaggedBy: string
  flaggedAt: string
}

export interface Booking {
  id: string
  date: string
  timeStart: string
  timeEnd: string
  type: BookingType
  customerId: string
  customerName: string
  customerStatus: string
  petId: string
  petName: string
  requestNotes: string
  status: BookingStatus
  jobStatus: JobStatus
  serviceId: string
  serviceName: string
  addOnIds: string[]
  addOnNames: string[]
  preConditions: PreCondition[]
  groomerId: string
  groomerName: string
  travelFee: number
  media: BookingMedia[]
  createdAt: string
}
