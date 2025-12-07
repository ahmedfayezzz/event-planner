import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-primary text-white relative overflow-hidden">
      {/* Pattern border at top */}
      {/* <div className="pattern-border-lg opacity-40"></div> */}
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.02]"></div>
      <div className="container py-12 md:py-16 relative z-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex flex-col items-start gap-3">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="ثلوثية الأعمال"
                  width={48}
                  height={48}
                  className="w-12 h-12 brightness-0 invert"
                />
              </div>
              <h3 className="text-2xl font-bold text-white">ثلوثية الأعمال</h3>
            </div>
            <p className="text-white/80 leading-relaxed max-w-xs">
              منصة إدارة فعاليات التواصل المهني الأسبوعية. نجمع النخبة لنصنع
              المستقبل.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="font-bold text-lg text-secondary">روابط سريعة</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/sessions"
                  className="text-white/80 hover:text-secondary transition-colors flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary/50"></span>
                  الأحداث
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-white/80 hover:text-secondary transition-colors flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary/50"></span>
                  عضوية جديدة
                </Link>
              </li>
              <li>
                <Link
                  href="/user/login"
                  className="text-white/80 hover:text-secondary transition-colors flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary/50"></span>
                  تسجيل الدخول
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="font-bold text-lg text-secondary">تواصل معنا</h4>
            <p className="text-white/80">
              نسعد بتواصلكم واستفساراتكم عبر قنواتنا الرسمية
            </p>
            <div className="flex gap-4">
              {/* Social placeholders */}
              <div className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer flex items-center justify-center border border-white/10">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/60">
          <p>
            © {new Date().getFullYear()} ثلوثية الأعمال. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
