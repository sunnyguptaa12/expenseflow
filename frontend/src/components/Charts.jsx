import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CHART_COLORS } from '../utils/constants.js';
import { periodLabel } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const axis = { stroke: 'var(--axis)', fontSize: 12, tickLine: false, axisLine: false };
const tooltipStyle = { background: 'var(--tip-bg)', border: '1px solid var(--tip-border)', borderRadius: 12, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,.12)' };

function useMoneyTooltip() {
  const { money } = useAuth();
  return { money, tip: <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} cursor={{ fill: 'rgba(120,140,120,.08)' }} /> };
}

export function IncomeExpenseBars({ series, height = 280 }) {
  const { money, tip } = useMoneyTooltip();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={series} margin={{ left: -10, right: 4 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="period" tickFormatter={periodLabel} {...axis} minTickGap={16} />
        <YAxis tickFormatter={(v) => money(v, true)} {...axis} width={64} />
        {tip}<Legend iconType="circle" />
        <Bar dataKey="income" name="Income" fill="#0f766e" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" name="Expenses" fill="#d97706" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ series, dataKey = 'expense', name = 'Expenses', color = '#d97706', height = 280 }) {
  const { money, tip } = useMoneyTooltip();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ left: -10, right: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="period" tickFormatter={periodLabel} {...axis} minTickGap={20} />
        <YAxis tickFormatter={(v) => money(v, true)} {...axis} width={64} />
        {tip}
        <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={3} dot={series.length < 14} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SavingsBars({ series, height = 280 }) {
  const { money, tip } = useMoneyTooltip();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={series} margin={{ left: -10, right: 4 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="period" tickFormatter={periodLabel} {...axis} minTickGap={16} />
        <YAxis tickFormatter={(v) => money(v, true)} {...axis} width={64} />
        {tip}
        <Bar dataKey="savings" name="Savings" radius={[6, 6, 0, 0]}>
          {series.map((d) => <Cell key={d.period} fill={d.savings >= 0 ? '#0f766e' : '#e11d48'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Breakdown({ data, nameKey = 'category', donut = false, height = 280 }) {
  const { money } = useAuth();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey={nameKey} innerRadius={donut ? '58%' : 0} outerRadius="82%" paddingAngle={donut ? 3 : 1} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopCategoriesBar({ data, height = 280 }) {
  const { money, tip } = useMoneyTooltip();
  const top = data.slice(0, 6);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={top} layout="vertical" margin={{ left: 10, right: 16 }}>
        <CartesianGrid stroke="var(--grid)" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => money(v, true)} {...axis} />
        <YAxis type="category" dataKey="category" {...axis} width={90} />
        {tip}
        <Bar dataKey="total" name="Spent" radius={[0, 6, 6, 0]}>{top.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
