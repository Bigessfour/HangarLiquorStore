import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ForecastPoint } from '@/types/forecast';

interface ForecastChartProps {
  data: ForecastPoint[];
}

function formatChartDate(date: string) {
  try {
    return format(parseISO(date), 'MMM dd');
  } catch {
    return date;
  }
}

export function ForecastChart({ data }: ForecastChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatChartDate(point.date),
  }));

  return (
    <div className="h-72 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#f97316"
            strokeWidth={3}
            strokeDasharray="5 2"
            name="Predicted"
          />
          <Line
            type="monotone"
            dataKey="upper"
            stroke="#f97316"
            strokeWidth={1}
            strokeOpacity={0.3}
            dot={false}
            name="Upper"
          />
          <Line
            type="monotone"
            dataKey="lower"
            stroke="#f97316"
            strokeWidth={1}
            strokeOpacity={0.3}
            dot={false}
            name="Lower"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
