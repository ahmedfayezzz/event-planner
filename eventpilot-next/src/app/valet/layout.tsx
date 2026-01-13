import { Inter } from "next/font/google";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ValetAuthProvider } from "@/components/valet/valet-auth-provider";

const inter = Inter({ subsets: ["latin"] });

export default function ValetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={cn(inter.className, "min-h-screen bg-gray-50")} suppressHydrationWarning>
        <TRPCProvider>
          <ValetAuthProvider>
            {children}
          </ValetAuthProvider>
          <Toaster position="top-center" richColors />
        </TRPCProvider>
      </body>
    </html>
  );
}
