import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import FloatingButtonWA from "@/components/floating-button-wa";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      {children}
      <FloatingButtonWA />
      <PublicFooter />
    </div>
  );
}
