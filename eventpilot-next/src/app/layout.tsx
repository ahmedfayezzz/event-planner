import type { Metadata } from "next";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  ConditionalNavbar,
  ConditionalFooter,
  ConditionalMain,
} from "@/components/layout/conditional-layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "ثلوثية الأعمال - EventPilot",
  description: "منصة إدارة فعاليات التواصل المهني",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "ثلوثية الأعمال - EventPilot",
    description: "منصة إدارة فعاليات التواصل المهني",
    images: ['/logo.png'],
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "ثلوثية الأعمال - EventPilot",
    description: "منصة إدارة فعاليات التواصل المهني",
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Load Cairo font from Google Fonts via link tag */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-cairo antialiased min-h-screen flex flex-col">
        <SessionProvider>
          <TRPCProvider>
            <ConditionalNavbar />
            <ConditionalMain>{children}</ConditionalMain>
            <ConditionalFooter />
            <Toaster position="top-center" />
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
