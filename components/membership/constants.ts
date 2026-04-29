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
    src: "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777448608/Angel_-_Pocco_yc1g46.jpg",
    name: "Angel - Pocco",
    caption: "Pelayanannya oke banget, ga rugi ikut membership!",
  },
  {
    type: "image",
    src: "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777448982/Winson_-_Nala_oxlnp1.jpg",
    name: "Winson - Nala",
    caption: "Groomernya ramah, hasilnya sesuai request juga",
  },
  {
    type: "image",
    src: "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777448832/Fina_-_Millie_gatyaa.png",
    name: "Fina - Millie",
    caption:
      "Anjingku aktif banget tapi groomernya bisa handle dengan sabar dan hasilnya bener-bener sesuai request",
  },
  {
    type: "image",
    src: "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777448743/Alfred_-_Marshmellow_wrymph.png",
    name: "Alfred - Marshmellow",
    caption:
      "Pickup nya selalu tepat waktu, dan sopnya juga ketat jadi tenang waktu pakai jasa packup anabul pawship",
  },
  {
    type: "image",
    src: "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777448930/Yulia_-_Milka_h4dw4d.jpg",
    name: "Yulia - Milka",
    caption:
      "Cuan banget ikut membership soalnya bisa grooming tiap minggu tp pusing bayar lagi!",
  },
  {
    type: "image",
    src: "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777449036/Nova_-_Binkie_dgie5r.png",
    name: "Nova - Binkie",
    caption:
      "Pelayanannya ramah, adminnya fast resp dan groomernya juga telaten",
  },
];
