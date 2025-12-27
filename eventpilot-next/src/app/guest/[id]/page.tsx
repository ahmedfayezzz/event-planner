import { GuestProfileClient } from "./guest-profile-client";

export default async function GuestProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { id } = await params;
  const { preview } = await searchParams;

  return <GuestProfileClient id={id} adminPreview={preview === "true"} />;
}
