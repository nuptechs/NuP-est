import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, Cell } from "recharts";
import type { ChartData } from "@/lib/content-detector";

interface AdaptiveChartProps {
  data: ChartData;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function AdaptiveChart({ data }: AdaptiveChartProps) {
  const chartConfig = data.dataKeys.reduce((acc, key, index) => {
    acc[key] = {
      label: key,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="my-6 rounded-lg border border-border/50 bg-secondary/10 dark:bg-secondary/5 p-4">
      {data.title && (
        <h4 className="text-sm font-semibold mb-4 text-center">{data.title}</h4>
      )}
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        {data.type === "bar" && (
          <BarChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey={data.labelKey} 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {data.dataKeys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
        
        {data.type === "line" && (
          <LineChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey={data.labelKey}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {data.dataKeys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        )}
        
        {data.type === "area" && (
          <AreaChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey={data.labelKey}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {data.dataKeys.map((key, index) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )}
        
        {data.type === "pie" && (
          <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Pie
              data={data.data}
              dataKey={data.dataKeys[0]}
              nameKey={data.labelKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
          </PieChart>
        )}
      </ChartContainer>
    </div>
  );
}
