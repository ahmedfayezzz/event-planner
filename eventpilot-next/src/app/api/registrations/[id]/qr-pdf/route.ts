import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { generateBrandedQRPdf } from "@/lib/qr-pdf";
import { createQRCheckInData } from "@/lib/qr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get registration with session, sponsors, and session guests
    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            eventSponsorships: {
              orderBy: { displayOrder: "asc" },
              include: {
                sponsor: true,
              },
            },
            sessionGuests: {
              orderBy: { displayOrder: "asc" },
              include: {
                guest: {
                  select: {
                    name: true,
                    title: true,
                    jobTitle: true,
                    company: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: "التسجيل غير موجود" }, { status: 404 });
    }

    if (!registration.isApproved) {
      return NextResponse.json({ error: "التسجيل غير مؤكد بعد" }, { status: 400 });
    }

    // Generate QR data
    const qrData = createQRCheckInData({
      type: "attendance",
      registrationId: registration.id,
      sessionId: registration.sessionId,
    });

    // Get attendee name
    const attendeeName =
      registration.user?.name || registration.guestName || undefined;

    // Extract sponsors from eventSponsorships
    const sponsors = registration.session.eventSponsorships
      .filter((es) => es.sponsor)
      .map((es) => ({
        name: es.sponsor!.name,
        logoUrl: es.sponsor!.logoUrl,
        type: es.sponsorshipType,
        socialMediaLinks: es.sponsor!.socialMediaLinks as Record<string, string> | null,
      }));

    // Extract session guests
    const sessionGuests = registration.session.sessionGuests.map((sg) => ({
      name: sg.guest.name,
      title: sg.guest.title,
      jobTitle: sg.guest.jobTitle,
      company: sg.guest.company,
      imageUrl: sg.guest.imageUrl,
    }));

    // Generate branded QR as PDF
    const pdfBuffer = await generateBrandedQRPdf(qrData, {
      sessionId: registration.sessionId,
      sessionTitle: registration.session.title,
      sessionDate: registration.session.date,
      attendeeName,
      locationUrl: registration.session.locationUrl ?? undefined,
      sponsors,
      sessionGuests,
    });

    if (!pdfBuffer) {
      return NextResponse.json({ error: "فشل إنشاء ملف PDF" }, { status: 500 });
    }

    // Check if download is requested
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get("download") === "true";

    // Return PDF with attendee name in filename
    const fileNameBase = attendeeName
      ? `${attendeeName}-${registration.session.title}`
      : `qr-${registration.session.title}`;
    const safeFilename = `qr-${registration.id}.pdf`; // Keep safe ASCII fallback
    const encodedFilename = encodeURIComponent(`${fileNameBase}.pdf`);

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
    console.error("Error generating QR PDF:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء ملف PDF" },
      { status: 500 }
    );
  }
}
