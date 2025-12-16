import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface ChartDataPoint {
  date: string;
  value: number;
  lowEstimate?: number;
  highEstimate?: number;
  purchasePrice?: number;
}

interface ValueTrendChartProps {
  data: ChartDataPoint[];
  purchasePrice?: number;
  showRange?: boolean;
}

export function ValueTrendChart({ data, purchasePrice, showRange = false }: ValueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No value history to display</p>
      </div>
    );
  }

  // Sort data by date
  const sortedData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Format data for chart
  const chartData = sortedData.map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    formattedValue: formatCurrency(point.value),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.payload.formattedValue}
            </p>
          ))}
          {payload[0].payload.lowEstimate && payload[0].payload.highEstimate && (
            <p className="text-xs text-muted-foreground mt-1">
              Range: {formatCurrency(payload[0].payload.lowEstimate)} - {formatCurrency(payload[0].payload.highEstimate)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          {showRange && (
            <>
              <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            return `$${(value / 1000).toFixed(0)}K`;
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {/* Value range area (if available) */}
        {showRange && chartData.some(d => d.lowEstimate && d.highEstimate) && (
          <>
            <Area
              type="monotone"
              dataKey="highEstimate"
              stroke="hsl(var(--muted-foreground))"
              fill="url(#colorRange)"
              strokeDasharray="5 5"
              strokeWidth={1}
              name="High Estimate"
            />
            <Area
              type="monotone"
              dataKey="lowEstimate"
              stroke="hsl(var(--muted-foreground))"
              fill="url(#colorRange)"
              strokeDasharray="5 5"
              strokeWidth={1}
              name="Low Estimate"
            />
          </>
        )}
        
        {/* Purchase price line */}
        {purchasePrice && purchasePrice > 0 && (
          <Line
            type="monotone"
            dataKey={() => purchasePrice}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            name="Purchase Price"
          />
        )}
        
        {/* Current value line */}
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="url(#colorValue)"
          strokeWidth={2}
          name="Current Value"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}


