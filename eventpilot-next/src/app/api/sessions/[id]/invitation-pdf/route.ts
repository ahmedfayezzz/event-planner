import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { generateInvitationPdf } from "@/lib/invitation-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (
      !session?.user ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;

    // Get session details
    const eventSession = await db.session.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        locationUrl: true,
      },
    });

    if (!eventSession) {
      return NextResponse.json({ error: "الحدث غير موجود" }, { status: 404 });
    }

    // Get sponsors for this session
    const sponsorships = await db.eventSponsorship.findMany({
      where: { sessionId: id },
      include: {
        sponsor: {
          select: {
            name: true,
            logoUrl: true,
            type: true,
          },
        },
      },
    });

    // Extract sponsor info
    const sponsors = sponsorships
      .filter((s) => s.sponsor && !s.isSelfSponsored)
      .map((s) => ({
        name: s.sponsor!.name,
        logoUrl: s.sponsor!.logoUrl,
        type: s.sponsor!.type,
      }));

    // Generate the PDF
    const pdfBuffer = await generateInvitationPdf({
      sessionTitle: eventSession.title,
      sessionDate: new Date(eventSession.date),
      location: eventSession.location || undefined,
      locationUrl: eventSession.locationUrl || undefined,
      sponsors,
    });

    if (!pdfBuffer) {
      return NextResponse.json({ error: "فشل إنشاء ملف PDF" }, { status: 500 });
    }

    // Check if download is requested
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get("download") === "true";

    // Return PDF
    // Use ASCII-only filename for Content-Disposition header (HTTP headers must be ASCII)
    // Arabic characters would cause ByteString conversion errors
    const safeFilename = `invitation-${eventSession.id}.pdf`;
    // Use RFC 5987 encoding for filename* to support Unicode
    const encodedFilename = encodeURIComponent(
      `دعوة-${eventSession.title}.pdf`
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
          : `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating invitation PDF:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء ملف PDF" },
      { status: 500 }
    );
  }
}
