import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">ثلوثية الأعمال</h3>
            <p className="text-sm text-muted-foreground">
              منصة إدارة فعاليات التواصل المهني الأسبوعية
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/sessions"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  الجلسات
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  إنشاء حساب
                </Link>
              </li>
              <li>
                <Link
                  href="/user/login"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  تسجيل الدخول
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">تواصل معنا</h4>
            <p className="text-sm text-muted-foreground">
              للاستفسارات والاقتراحات
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ثلوثية الأعمال. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
