"use client";
import React from "react";
import Image from "next/image";

export default function FloatingButtonWA() {
  const handleWhatsAppRedirect = () => {
    const message = encodeURIComponent(
      "Hello, I’d like to know more about your services.",
    );
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleWhatsAppRedirect}
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer"
    >
      {/* Ikon WhatsApp pakai Lucide */}
      <Image src="/images/icon-wa.png" alt="WhatsApp" width={24} height={24} />
    </button>
  );
}
