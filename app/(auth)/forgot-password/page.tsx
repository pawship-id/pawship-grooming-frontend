"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { forgotPasswordRequest } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setErrors(["Masukkan format email yang valid"]);
      return;
    }

    setIsLoading(true);

    try {
      await forgotPasswordRequest({ email });
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.";
      setErrors([message]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
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
                Lupa Password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Masukkan email akun Anda
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Jika email Anda terdaftar, kami telah mengirim link reset
                    password. Silakan cek kotak masuk email Anda.
                  </AlertDescription>
                </Alert>
                <Link href="/login">
                  <Button variant="outline" className="mt-2">
                    Kembali ke Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {errors.length > 0 && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <ul className="list-disc pl-4 space-y-1">
                      {errors.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@pawship.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Mengirim..." : "Kirim Link Reset"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Ingat password?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Masuk sekarang
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
