import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { generateAgendaPdf } from "@/lib/agenda-pdf";

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

    // Get session details with guests
    const eventSession = await db.session.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        sessionGuests: {
          orderBy: { displayOrder: "asc" },
          take: 1, // Only get the first guest
          include: {
            guest: {
              select: {
                name: true,
                title: true,
                jobTitle: true,
                company: true,
              },
            },
          },
        },
      },
    });

    if (!eventSession) {
      return NextResponse.json({ error: "الحدث غير موجود" }, { status: 404 });
    }

    // Extract first guest info if exists
    const firstGuest = eventSession.sessionGuests[0];
    const guestName = firstGuest
      ? [firstGuest.guest.title, firstGuest.guest.name]
          .filter(Boolean)
          .join(" ")
      : undefined;
    const guestJobTitle = firstGuest
      ? [firstGuest.guest.jobTitle, firstGuest.guest.company]
          .filter(Boolean)
          .join(" - ")
      : undefined;

    // Generate the agenda PDF
    const pdfBuffer = await generateAgendaPdf({
      sessionTitle: eventSession.title,
      guestName,
      guestJobTitle,
    });

    if (!pdfBuffer) {
      return NextResponse.json({ error: "فشل إنشاء ملف PDF" }, { status: 500 });
    }

    // Check if download is requested
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get("download") === "true";

    // Return PDF
    // Use ASCII-only filename for Content-Disposition header (HTTP headers must be ASCII)
    const safeFilename = `agenda-${eventSession.id}.pdf`;
    // Use RFC 5987 encoding for filename* to support Unicode
    const encodedFilename = encodeURIComponent(
      `أجندة-${eventSession.title}.pdf`
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
    console.error("Error generating agenda PDF:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء ملف PDF" },
      { status: 500 }
    );
  }
}
