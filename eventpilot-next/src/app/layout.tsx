import type { Metadata } from "next";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "ثلوثية الأعمال - EventPilot",
  description: "منصة إدارة فعاليات التواصل المهني",
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
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="top-center" />
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
