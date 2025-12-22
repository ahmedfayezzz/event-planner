"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartDataItem {
  sessionNumber: number;
  title: string;
  date: Date;
  dinner: number;
  beverage: number;
  dessert: number;
  other: number;
  total: number;
  selfSponsored: number;
}

interface ChartData {
  chartData: ChartDataItem[];
  totals: {
    dinner: number;
    beverage: number;
    dessert: number;
    other: number;
    selfSponsored: number;
  };
}

interface SponsorshipChartProps {
  data: ChartData;
}

export function SponsorshipChart({ data }: SponsorshipChartProps) {
  // Transform data for the chart
  const chartData = data.chartData.map((item) => ({
    name: `#${item.sessionNumber}`,
    عشاء: item.dinner,
    مشروبات: item.beverage,
    حلا: item.dessert,
    أخرى: item.other,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>تاريخ الرعايات</CardTitle>
        <CardDescription>
          توزيع أنواع الرعاية على آخر {data.chartData.length} فعالية
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-3 bg-amber-500/10 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{data.totals.dinner}</div>
            <div className="text-xs text-muted-foreground">عشاء</div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.totals.beverage}</div>
            <div className="text-xs text-muted-foreground">مشروبات</div>
          </div>
          <div className="text-center p-3 bg-pink-500/10 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">{data.totals.dessert}</div>
            <div className="text-xs text-muted-foreground">حلا</div>
          </div>
          <div className="text-center p-3 bg-gray-500/10 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{data.totals.other}</div>
            <div className="text-xs text-muted-foreground">أخرى</div>
          </div>
          <div className="text-center p-3 bg-purple-500/10 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{data.totals.selfSponsored}</div>
            <div className="text-xs text-muted-foreground">ذاتية</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ direction: "rtl", textAlign: "right" }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend
                wrapperStyle={{ direction: "rtl" }}
                formatter={(value) => <span style={{ marginInlineEnd: "8px" }}>{value}</span>}
              />
              <Bar dataKey="عشاء" stackId="a" fill="#f59e0b" />
              <Bar dataKey="مشروبات" stackId="a" fill="#3b82f6" />
              <Bar dataKey="حلا" stackId="a" fill="#ec4899" />
              <Bar dataKey="أخرى" stackId="a" fill="#6b7280" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
