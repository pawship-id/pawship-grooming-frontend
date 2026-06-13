"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyResetTokenRequest, resetPasswordRequest } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setErrors(["Token tidak ditemukan"]);
      setIsVerifying(false);
      return;
    }

    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams]);

  const verifyToken = async (tokenValue: string) => {
    try {
      const result = await verifyResetTokenRequest(tokenValue);
      if (result.valid) {
        setUsername(result.user.username);
        setEmail(result.user.email || "");
        setTokenValid(true);
      } else {
        setErrors(["Token tidak valid atau sudah kadaluarsa"]);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memverifikasi token";
      setErrors([message]);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage("");
    setIsLoading(true);

    if (password !== confirmPassword) {
      setErrors(["Konfirmasi password tidak cocok."]);
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrors(["Password minimal 6 karakter."]);
      setIsLoading(false);
      return;
    }

    try {
      await resetPasswordRequest({ token, password });
      setSuccessMessage("Password berhasil direset!");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.";
      setErrors([message]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">
            Memverifikasi token...
          </p>
        </div>
      </div>
    );
  }

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
                Reset Password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Buat password baru untuk akun Anda
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {errors.length > 0 && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <ul className="list-disc pl-4 space-y-1">
                  {errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {successMessage && (
              <Alert className="mb-4 border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {!tokenValid ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">
                  Token tidak valid atau sudah kadaluarsa
                </p>
                <Link href="/login">
                  <Button>Kembali ke Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password Baru</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimal 6 karakter
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">
                    Konfirmasi Password Baru
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 w-full"
                  disabled={isLoading || !!successMessage}
                >
                  {isLoading ? "Menyimpan..." : "Reset Password"}
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

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
