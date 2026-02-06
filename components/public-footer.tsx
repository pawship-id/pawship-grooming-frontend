import Image from "next/image"
import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"

export function PublicFooter() {
  return (
    <footer id="contact" className="border-t border-border/50 bg-card">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex flex-col gap-4">
            <Image
              src="/images/pawship-square-logo.png"
              alt="PAWship"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Professional pet grooming services for your beloved companions. We treat every pet like family.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-bold text-foreground">Quick Links</h3>
            <Link href="/#services" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              Services
            </Link>
            <Link href="/#about" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              About Us
            </Link>
            <Link href="/#contact" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              Contact
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-bold text-foreground">Contact Us</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span>+62 812 3456 7890</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span>hello@pawship.com</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Jakarta, Indonesia</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
          2026 PAWship. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
