"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Home } from "lucide-react";

export default function RegisterSuccessPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="w-full border-border/50 shadow-lg">
          <CardHeader className="flex flex-col items-center gap-2 pb-2">
            <Link href="/">
              <Image
                src="/images/pawship-square-logo.png"
                alt="Pawship Logo"
                width={60}
                height={60}
                className="w-16 object-contain"
              />
            </Link>
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Email Terkirim
              </h1>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/20">
                <Mail className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Kami telah mengirim email ke:
              </p>
              <p className="font-medium text-foreground break-all">
                {email || "email Anda"}
              </p>
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
                <p className="font-medium mb-2">Langkah selanjutnya:</p>
                <ol className="list-decimal list-inside space-y-1 text-left">
                  <li>Buka inbox email Anda</li>
                  <li>Klik link yang kami kirimkan</li>
                  <li>Atur password Anda</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tips:</strong> Jika tidak menemukan email, cek folder{" "}
                <strong>Spam</strong> atau <strong>Promosi</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/login" className="w-full">
                <Button className="w-full">Kembali ke Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
