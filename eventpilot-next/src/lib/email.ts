import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  content_id?: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

/**
 * Base email sending function using Resend
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: SendEmailParams): Promise<boolean> {
  const recipient = Array.isArray(to) ? to : [to];

  try {
    const fromEmail = process.env.FROM_EMAIL;

    if (!process.env.RESEND_API_KEY) {
      console.warn(`RESEND_API_KEY not configured - email not sent to ${recipient.join(", ")}`);
      return false;
    }

    if (!fromEmail) {
      console.warn(`FROM_EMAIL not configured - email not sent to ${recipient.join(", ")}`);
      return false;
    }

    const mappedAttachments = attachments
      ? attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
        }))
      : undefined;

    console.log(`Sending email to ${recipient.join(", ")}: ${subject}`);

    // Resend requires at least one of: text, html, or react template
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject,
      text: text ?? "",
      html,
      attachments: mappedAttachments,
    });

    console.log(`Email sent successfully to ${recipient.join(", ")} (id: ${response.data?.id ?? "unknown"})`);
    return true;
  } catch (error) {
    console.error(`Email sending failed to ${recipient.join(", ")}:`, error);
    return false;
  }
}

interface SessionInfo {
  title: string;
  sessionNumber: number;
  date: Date;
  location: string | null;
  slug: string | null;
  id: string;
  sendQrInEmail?: boolean;
}

/**
 * Send confirmation email to participant
 */
export async function sendConfirmationEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo
): Promise<boolean> {
  const dateStr = session.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const body = `
مرحباً ${name},

تم تأكيد تسجيلك في:
${session.title}
التجمع رقم ${session.sessionNumber}

التاريخ: ${dateStr}
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}

نتطلع لرؤيتك معنا!

فريق ثلوثية الأعمال
  `.trim();

  return sendEmail({
    to: emailAddress,
    subject: `تأكيد التسجيل - ${session.title}`,
    text: body,
  });
}

/**
 * Send registration received email (pending approval)
 */
export async function sendPendingEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo
): Promise<boolean> {
  const dateStr = session.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const body = `
مرحباً ${name},

شكراً لتسجيلك في:
${session.title}
التجمع رقم ${session.sessionNumber}

التاريخ: ${dateStr}
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}

تسجيلك قيد المراجعة وسيتم إخطارك بالموافقة قريباً.

فريق ثلوثية الأعمال
  `.trim();

  return sendEmail({
    to: emailAddress,
    subject: `استلام التسجيل - ${session.title}`,
    text: body,
  });
}

/**
 * Send registration confirmed email with optional QR code
 */
export async function sendConfirmedEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  qrData?: string
): Promise<boolean> {
  const dateStr = session.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  let qrSection = "";
  if (qrData && session.sendQrInEmail) {
    qrSection = `
<br><br>
<p style="text-align: center;"><strong>رمز الحضور الخاص بك:</strong></p>
<p style="text-align: center;"><img src="cid:qrcode" alt="QR Code" style="max-width: 200px;"></p>
<p style="text-align: center; font-size: 12px;">أظهر هذا الرمز عند الحضور</p>
`;
  }

  const htmlBody = `
<html>
<head>
<meta charset="utf-8">
</head>
<body dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
<p>مرحباً ${name},</p>

<p>تم تأكيد تسجيلك في:</p>
<p><strong>${session.title}</strong><br>
التجمع رقم ${session.sessionNumber}</p>

<p>التاريخ: ${dateStr}<br>
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
${qrSection}
<p>نتطلع لرؤيتك معنا!</p>

<p>فريق ثلوثية الأعمال</p>
</body>
</html>
  `.trim();

  const plainBody = `
مرحباً ${name},

تم تأكيد تسجيلك في:
${session.title}
التجمع رقم ${session.sessionNumber}

التاريخ: ${dateStr}
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}

نتطلع لرؤيتك معنا!

فريق ثلوثية الأعمال
  `.trim();

  // Build attachments if QR code provided
  let attachments: EmailAttachment[] | undefined;
  if (qrData && session.sendQrInEmail) {
    if (qrData.startsWith("data:image/png;base64,")) {
      const qrBase64 = qrData.split(",")[1];
      attachments = [
        {
          filename: "qrcode.png",
          content: qrBase64,
          content_id: "qrcode",
        },
      ];
    }
  }

  return sendEmail({
    to: emailAddress,
    subject: `تأكيد التسجيل - ${session.title}`,
    html: htmlBody,
    text: plainBody,
    attachments,
  });
}

/**
 * Send email to companion notifying them of registration
 */
export async function sendCompanionEmail(
  emailAddress: string,
  companionName: string,
  registrantName: string,
  session: SessionInfo,
  isApproved = false,
  qrData?: string
): Promise<boolean> {
  const dateStr = session.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  let statusMessage: string;
  let qrSection = "";

  if (isApproved) {
    statusMessage = "نتطلع لرؤيتك معنا!";
    if (qrData && session.sendQrInEmail) {
      qrSection = `
<br><br>
<p style="text-align: center;"><strong>رمز الحضور الخاص بك:</strong></p>
<p style="text-align: center;"><img src="cid:qrcode" alt="QR Code" style="max-width: 200px;"></p>
<p style="text-align: center; font-size: 12px;">أظهر هذا الرمز عند الحضور</p>
`;
    }
  } else {
    statusMessage = "تسجيلك قيد المراجعة وسيتم إخطارك بالموافقة قريباً.";
  }

  const htmlBody = `
<html>
<head>
<meta charset="utf-8">
</head>
<body dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
<p>مرحباً ${companionName},</p>

<p>تم تسجيلك كمرافق للأستاذ/ة ${registrantName} في:</p>
<p><strong>${session.title}</strong><br>
التجمع رقم ${session.sessionNumber}</p>

<p>التاريخ: ${dateStr}<br>
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
${qrSection}
<p>${statusMessage}</p>

<p>فريق ثلوثية الأعمال</p>
</body>
</html>
  `.trim();

  const plainBody = `
مرحباً ${companionName},

تم تسجيلك كمرافق للأستاذ/ة ${registrantName} في:
${session.title}
التجمع رقم ${session.sessionNumber}

التاريخ: ${dateStr}
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}

${statusMessage}

فريق ثلوثية الأعمال
  `.trim();

  // Build attachments if QR code provided
  let attachments: EmailAttachment[] | undefined;
  if (isApproved && qrData && session.sendQrInEmail) {
    if (qrData.startsWith("data:image/png;base64,")) {
      const qrBase64 = qrData.split(",")[1];
      attachments = [
        {
          filename: "qrcode.png",
          content: qrBase64,
          content_id: "qrcode",
        },
      ];
    }
  }

  return sendEmail({
    to: emailAddress,
    subject: `تم تسجيلك كمرافق - ${session.title}`,
    html: htmlBody,
    text: plainBody,
    attachments,
  });
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  emailAddress: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const body = `
مرحباً ${name},

لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.

اضغط على الرابط التالي لإعادة تعيين كلمة المرور:
${resetUrl}

هذا الرابط صالح لمدة ساعة واحدة فقط.

إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.

فريق ثلوثية الأعمال
  `.trim();

  return sendEmail({
    to: emailAddress,
    subject: "إعادة تعيين كلمة المرور - ثلوثية الأعمال",
    text: body,
  });
}

/**
 * Send invitation email with registration link
 */
export async function sendInvitationEmail(
  emailAddress: string,
  session: SessionInfo,
  token: string,
  customMessage?: string
): Promise<boolean> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const registrationLink = `${baseUrl}/event/${session.slug || session.id}/register?token=${token}`;

  const dateStr = session.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = session.date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let body: string;
  if (customMessage) {
    body = customMessage.replace("[رابط التسجيل]", registrationLink);
  } else {
    body = `
مرحباً،

نود دعوتك لحضور جلسة "${session.title}" في ثلوثية الأعمال.

تفاصيل الجلسة:
📅 التاريخ: ${dateStr}
🕐 الوقت: ${timeStr}
📍 المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}

هذه دعوة خاصة. استخدم الرابط أدناه للتسجيل:
${registrationLink}

نتطلع لرؤيتك معنا!

فريق ثلوثية الأعمال
    `.trim();
  }

  return sendEmail({
    to: emailAddress,
    subject: `دعوة خاصة - ${session.title}`,
    text: body,
  });
}
