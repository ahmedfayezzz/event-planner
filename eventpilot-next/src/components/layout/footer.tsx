"use client";

import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Mail, Phone, MessageCircle } from "lucide-react";

export function Footer() {
  const { data: settings } = api.settings.get.useQuery();

  const socialLinks = [
    {
      name: "X (Twitter)",
      handle: settings?.twitterHandle,
      href: settings?.twitterHandle
        ? `https://twitter.com/${settings.twitterHandle.replace("@", "")}`
        : null,
      icon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      handle: settings?.instagramHandle,
      href: settings?.instagramHandle
        ? `https://instagram.com/${settings.instagramHandle.replace("@", "")}`
        : null,
      icon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: "Snapchat",
      handle: settings?.snapchatHandle,
      href: settings?.snapchatHandle
        ? `https://snapchat.com/add/${settings.snapchatHandle.replace("@", "")}`
        : null,
      icon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      handle: settings?.linkedinUrl,
      href: settings?.linkedinUrl || null,
      icon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      handle: settings?.whatsappNumber,
      href: settings?.whatsappNumber
        ? `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`
        : null,
      icon: <MessageCircle className="h-5 w-5" />,
    },
  ];

  const activeSocialLinks = socialLinks.filter((link) => link.href);

  return (
    <footer className="bg-primary text-white relative overflow-hidden">
      {/* Pattern border at top */}
      {/* <div className="pattern-border-lg opacity-40"></div> */}
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.02]"></div>
      <div className="container py-12 md:py-16 relative z-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex flex-col items-start gap-3">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt={settings?.siteName ?? "ثلوثية الأعمال"}
                  width={48}
                  height={48}
                  className="w-12 h-12 brightness-0 invert"
                />
              </div>
              <h3 className="text-2xl font-bold text-white">
                {settings?.siteName ?? "ثلوثية الأعمال"}
              </h3>
            </div>
            <p className="text-white/80 leading-relaxed max-w-xs">
              منصة إدارة فعاليات التواصل المهني الأسبوعية. نجمع النخبة لنصنع
              المستقبل.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="font-bold text-lg text-accent">روابط سريعة</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/sessions"
                  className="text-white/80 hover:text-accent transition-colors flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/50"></span>
                  الأحداث
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-white/80 hover:text-accent transition-colors flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/50"></span>
                  عضوية جديدة
                </Link>
              </li>
              <li>
                <Link
                  href="/user/login"
                  className="text-white/80 hover:text-accent transition-colors flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/50"></span>
                  تسجيل الدخول
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="font-bold text-lg text-accent">تواصل معنا</h4>
            <div className="space-y-3 text-white/80">
              {settings?.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span dir="ltr">{settings.contactEmail}</span>
                </a>
              )}
              {settings?.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone}`}
                  className="flex items-center gap-2 hover:text-accent transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span dir="ltr">{settings.contactPhone}</span>
                </a>
              )}
              {!settings?.contactEmail && !settings?.contactPhone && (
                <p>نسعد بتواصلكم واستفساراتكم عبر قنواتنا الرسمية</p>
              )}
            </div>
            {activeSocialLinks.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {activeSocialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center border border-white/10"
                    title={link.name}
                  >
                    <span className="sr-only">{link.name}</span>
                    {link.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/60">
          <p>
            © {new Date().getFullYear()} {settings?.siteName ?? "ثلوثية الأعمال"}
            . جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
