export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout removes the main navbar/footer for embedded content
  return <>{children}</>;
}
