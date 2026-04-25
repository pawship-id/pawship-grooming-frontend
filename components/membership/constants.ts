import { CalendarCheck, Clock, DollarSign, Heart } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp
// ─────────────────────────────────────────────────────────────────────────────
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export const WA_RECOMMEND = waLink(
  "Halo Pawship! Saya ingin tanya rekomendasi paket membership untuk anabul saya 🐾",
);
export const WA_ADMIN = waLink(
  "Halo Pawship! Saya ingin tahu lebih lanjut tentang program membership.",
);
export const WA_ELIGIBILITY = waLink(
  "Halo Pawship! Saya ingin cek kelayakan untuk menjadi member Pawship 🐾",
);

// ─────────────────────────────────────────────────────────────────────────────
// Problems
// ─────────────────────────────────────────────────────────────────────────────
export const problems = [
  {
    icon: Clock,
    title: "Ribet dan Sibuk",
    desc: "Harus booking ulang terus, antre, dan repot tiap mau grooming.",
  },
  {
    icon: DollarSign,
    title: "Biaya Grooming Mahal",
    desc: "Bayar per sesi terasa berat kalau grooming sudah jadi rutinitas.",
  },
  {
    icon: CalendarCheck,
    title: "Slot Penuh Saat Butuh",
    desc: "Waktu yang pas malah sudah penuh karena rebutan dengan pelanggan lain.",
  },
  {
    icon: Heart,
    title: "Anabul Stress",
    desc: "Berganti-ganti tempat atau groomer baru bikin anabul tidak nyaman.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Solutions
// ─────────────────────────────────────────────────────────────────────────────
export const solutions = [
  "Tidak perlu mikir biaya lagi setiap grooming",
  "Bisa antar-jemput dan home grooming",
  "Slot jadwal prioritas",
  "Lebih praktis untuk perawatan jangka panjang",
];

// ─────────────────────────────────────────────────────────────────────────────
// Packages
// ─────────────────────────────────────────────────────────────────────────────
export interface PackagePlan {
  id: string;
  name: string;
  subtitle: string;
  tag?: { label: string; variant: "best" | "premium" };
  featured?: boolean;
  benefits: string[];
}

export const packages: PackagePlan[] = [
  {
    id: "explorer",
    name: "Explorer",
    subtitle: "Perawatan Essensial",
    benefits: [
      "Unlimited Grooming*",
      "Harga khusus member",
      "Cocok untuk first-time member",
    ],
  },
  {
    id: "traveller",
    name: "Traveller",
    subtitle: "Perawatan Rutin",
    tag: { label: "Best Value", variant: "best" },
    featured: true,
    benefits: [
      "Unlimited Grooming + Styling*",
      "Harga khusus member",
      "Free pickup / home grooming*",
    ],
  },
  {
    id: "voyager",
    name: "Voyager",
    subtitle: "Perawatan Premium",
    tag: { label: "Premium", variant: "premium" },
    benefits: [
      "Semua benefit Traveller",
      "Unlimited pickup",
      "Slot prioritas Daycare + Hotel + Grooming",
      "Premium Members only!",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────────────────────────────────────
export type TestimonialItem = {
  type: "image" | "video";
  src: string;
  poster?: string;
  name: string;
  caption: string;
};

export const testimonials: TestimonialItem[] = [
  {
    type: "image",
    src: "https://placedog.net/400/500?id=1",
    name: "@pawrent_cici",
    caption: "Grooming-nya rapi banget, anabulku happy!",
  },
  {
    type: "image",
    src: "https://placedog.net/400/560?id=2",
    name: "@bundanya_mochi",
    caption: "Pickup tepat waktu, pelayanan ramah 🐶",
  },
  {
    type: "video",
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    poster: "https://placedog.net/400/500?id=3",
    name: "@mr.paws.daily",
    caption: "Sudah 6 bulan member, worth it banget!",
  },
  {
    type: "image",
    src: "https://placedog.net/400/480?id=4",
    name: "@aningtyas_pet",
    caption: "Slot prioritas sangat membantu, thx Pawship!",
  },
  {
    type: "image",
    src: "https://placedog.net/400/520?id=5",
    name: "@doglover.id",
    caption: "Home grooming-nya profesional banget 🐾",
  },
  {
    type: "video",
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    poster: "https://placedog.net/400/500?id=6",
    name: "@pawship_fan",
    caption: "Anabul gak stress lagi ganti-ganti groomer!",
  },
];
