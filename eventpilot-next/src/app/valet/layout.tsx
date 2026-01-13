import { ValetAuthProvider } from "@/components/valet/valet-auth-provider";

export default function ValetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ValetAuthProvider>
      {children}
    </ValetAuthProvider>
  );
}
