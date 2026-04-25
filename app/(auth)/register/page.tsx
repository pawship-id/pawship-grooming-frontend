"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkPhoneRequest,
  registerRequest,
  sendPasswordSetupRequest,
  type RegisterPayload,
} from "@/lib/api/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Home } from "lucide-react";

interface ApiValidationError {
  statusCode: number;
  message: string | string[];
  error: string;
}

type Step = "phone" | "new-user" | "email-setup" | "send-link";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const result = await checkPhoneRequest(phoneNumber);

      if (!result.exists) {
        // Phone not registered - go to new user form
        setStep("new-user");
      } else if (result.hasEmail && result.hasPassword) {
        // Phone exists with complete credentials - cannot register
        setErrors(["Nomor sudah terdaftar, silakan login"]);
      } else if (result.hasEmail && !result.hasPassword) {
        // Phone exists with email but no password - send link to existing email
        setUsername(result.username || "");
        setEmail(result.email || "");
        setStep("send-link");
      } else {
        // Phone exists but no email - need to input email for setup
        setUsername(result.username || "");
        setEmail("");
        setStep("email-setup");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as ApiValidationError;
          const msgs = parsed.message;
          if (Array.isArray(msgs)) {
            setErrors(msgs);
          } else {
            setErrors([msgs]);
          }
        } catch {
          setErrors([err.message]);
        }
      } else {
        setErrors(["Terjadi kesalahan. Silakan coba lagi."]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
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
      const payload: RegisterPayload = {
        username,
        email,
        phone_number: phoneNumber,
        password,
      };
      await registerRequest(payload);

      setSuccessMessage("Akun berhasil dibuat! Silakan masuk.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as ApiValidationError;
          const msgs = parsed.message;
          if (Array.isArray(msgs)) {
            setErrors(msgs);
          } else {
            setErrors([msgs]);
          }
        } catch {
          setErrors([err.message]);
        }
      } else {
        setErrors(["Terjadi kesalahan. Silakan coba lagi."]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage("");
    setIsLoading(true);

    try {
      await sendPasswordSetupRequest({
        phone_number: phoneNumber,
        email,
      });

      // Redirect to success page with email info
      router.push(`/register/success?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message) as ApiValidationError;
          const msgs = parsed.message;
          if (Array.isArray(msgs)) {
            setErrors(msgs);
          } else {
            setErrors([msgs]);
          }
        } catch {
          setErrors([err.message]);
        }
      } else {
        setErrors(["Terjadi kesalahan. Silakan coba lagi."]);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                {step === "phone" && "Buat Akun Baru"}
                {step === "new-user" && "Lengkapi Data Anda"}
                {step === "email-setup" && "Verifikasi Email"}
                {step === "send-link" && "Kirim Link Set Password"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === "phone" && "Masukkan nomor telepon untuk memulai"}
                {step === "new-user" && "Isi data berikut untuk mendaftar"}
                {step === "email-setup" && "Masukkan email untuk verifikasi"}
                {step === "send-link" &&
                  "Akun Anda ditemukan, kami akan kirim link ke email Anda"}
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
              <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                {successMessage}
              </div>
            )}

            {step === "phone" && (
              <form onSubmit={handleCheckPhone} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone_number">Nomor Telepon</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="mt-2 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Memeriksa..." : "Cek"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Masuk sekarang
                  </Link>
                </p>
              </form>
            )}

            {step === "new-user" && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone_display">Nomor Telepon</Label>
                  <Input
                    id="phone_display"
                    value={phoneNumber}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@pawship.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
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
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setStep("phone");
                      setErrors([]);
                    }}
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !isValidEmail(email)}
                  >
                    {isLoading ? "Mendaftarkan..." : "Daftar"}
                  </Button>
                </div>
              </form>
            )}

            {step === "email-setup" && (
              <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
                <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                  Data Anda ditemukan, silahkan input email untuk aktivasi akun.
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="username_display">Username</Label>
                  <Input
                    id="username_display"
                    value={username}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone_display">Nomor Telepon</Label>
                  <Input
                    id="phone_display"
                    value={phoneNumber}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email_setup">Email</Label>
                  <Input
                    id="email_setup"
                    name="email"
                    type="email"
                    placeholder="you@pawship.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Kami akan mengirim link untuk mengatur password Anda
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setStep("phone");
                      setErrors([]);
                      setUsername("");
                      setEmail("");
                    }}
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !isValidEmail(email)}
                  >
                    {isLoading ? "Mengirim..." : "Kirim Email"}
                  </Button>
                </div>
              </form>
            )}

            {step === "send-link" && (
              <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sl_username">Username</Label>
                  <Input
                    id="sl_username"
                    value={username}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="sl_phone">Nomor Telepon</Label>
                  <Input
                    id="sl_phone"
                    value={phoneNumber}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="sl_email">Email</Label>
                  <Input
                    id="sl_email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link untuk mengatur password akan dikirim ke email ini
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Jika ini bukan email Anda, silahkan hubungi admin{" "}
                    <a
                      href="mailto:admin@pawship.id"
                      className="font-medium text-primary hover:underline"
                    >
                      pawship.id
                    </a>
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setStep("phone");
                      setErrors([]);
                      setUsername("");
                      setEmail("");
                    }}
                  >
                    Kembali
                  </Button>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Mengirim..." : "Kirim Link"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
