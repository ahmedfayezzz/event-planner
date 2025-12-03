import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8 text-center">
      <h1 className="text-9xl font-bold text-muted-foreground/20">404</h1>
      <h2 className="text-2xl font-bold mt-4">الصفحة غير موجودة</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <div className="flex gap-4 mt-8">
        <Button asChild>
          <Link href="/">
            <Home className="ml-2 h-4 w-4" />
            الصفحة الرئيسية
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sessions">
            <ArrowRight className="ml-2 h-4 w-4" />
            الجلسات
          </Link>
        </Button>
      </div>
    </div>
  );
}
