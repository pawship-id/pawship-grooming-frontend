import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Image
        src="/images/pawship-square-logo.png"
        alt="PAWship"
        width={100}
        height={100}
        className="h-20 w-auto opacity-50"
      />
      <div>
        <h1 className="font-display text-4xl font-extrabold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for does not exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  )
}
