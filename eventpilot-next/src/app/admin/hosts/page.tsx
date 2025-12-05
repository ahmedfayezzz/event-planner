"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatArabicDate } from "@/lib/utils";
import { HOSTING_TYPES, getHostingTypeLabel } from "@/lib/constants";
import {
  UtensilsCrossed,
  Download,
  Loader2,
  ChevronDown,
  User,
  UserCheck,
} from "lucide-react";

interface HostItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  hostingTypes: string[];
  createdAt: Date;
  isGuest: boolean;
}

export default function AdminHostsPage() {
  const [hostingTypeFilter, setHostingTypeFilter] = useState<string>("all");

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.admin.getHosts.useInfiniteQuery(
    {
      hostingType: hostingTypeFilter !== "all" ? hostingTypeFilter : undefined,
      limit: 50,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const allHosts: HostItem[] =
    data?.pages.flatMap((page) => [...page.users, ...page.guestHosts]) ?? [];

  const { refetch: fetchCsv } = api.admin.exportHosts.useQuery(undefined, {
    enabled: false,
  });

  const handleExport = async () => {
    const result = await fetchCsv();
    if (result.data) {
      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `hosts-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success(`تم تصدير ${result.data.count} مضيف`);
    }
  };

  // Show skeleton only on initial load
  const showTableSkeleton = isLoading && allHosts.length === 0;
  // Show inline loading indicator when filtering
  const showInlineLoading = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المضيفين</h1>
          <p className="text-muted-foreground">
            قائمة المتطوعين لتقديم الضيافة
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="me-2 h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Select
                value={hostingTypeFilter}
                onValueChange={setHostingTypeFilter}
              >
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue placeholder="نوع الضيافة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {HOSTING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hosts Table */}
      <Card>
        <CardContent className="p-0">
          {showTableSkeleton ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : allHosts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>لا يوجد مضيفين</p>
            </div>
          ) : (
            <>
              {/* Inline loading indicator */}
              {showInlineLoading && (
                <div className="flex items-center justify-center gap-2 py-2 bg-muted/50 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحميل...
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المضيف</TableHead>
                    <TableHead>التواصل</TableHead>
                    <TableHead>الشركة</TableHead>
                    <TableHead>أنواع الضيافة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allHosts.map((host) => (
                    <TableRow key={host.id}>
                      <TableCell>
                        <p className="font-medium">{host.name || "-"}</p>
                      </TableCell>
                      <TableCell dir="ltr">
                        <div>
                          {host.email ? (
                            <a
                              href={`mailto:${host.email}`}
                              className="text-sm hover:underline underline"
                            >
                              {host.email}
                            </a>
                          ) : (
                            <p className="text-sm">-</p>
                          )}
                          {host.phone ? (
                            <a
                              href={`tel:${host.phone}`}
                              className="text-xs text-muted-foreground hover:underline underline block"
                            >
                              {host.phone}
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground">-</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{host.companyName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {host.hostingTypes.map((type) => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              {getHostingTypeLabel(type)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={host.isGuest ? "secondary" : "default"}
                          className="gap-1"
                        >
                          {host.isGuest ? (
                            <>
                              <User className="h-3 w-3" />
                              زائر
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3" />
                              عضو
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatArabicDate(new Date(host.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Load More Button */}
              {hasNextPage && (
                <div className="p-4 text-center border-t">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="me-2 h-4 w-4" />
                    )}
                    تحميل المزيد
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
