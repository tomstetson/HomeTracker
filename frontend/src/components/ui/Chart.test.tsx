import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValueTrendChart } from './Chart';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('ValueTrendChart', () => {
  const mockData = [
    { date: '2024-01-01', value: 300000 },
    { date: '2024-06-01', value: 320000 },
    { date: '2024-12-01', value: 350000 },
  ];

  it('should render chart with data', () => {
    render(<ValueTrendChart data={mockData} purchasePrice={250000} />);
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<ValueTrendChart data={[]} />);
    
    expect(screen.getByText('No value history to display')).toBeInTheDocument();
  });

  it('should render purchase price line when provided', () => {
    render(<ValueTrendChart data={mockData} purchasePrice={250000} />);
    
    expect(screen.getByTestId('line')).toBeInTheDocument();
  });

  it('should render value range when provided', () => {
    const dataWithRange = mockData.map(d => ({
      ...d,
      lowEstimate: d.value - 10000,
      highEstimate: d.value + 10000,
    }));

    render(<ValueTrendChart data={dataWithRange} showRange={true} />);
    
    const areas = screen.getAllByTestId('area');
    expect(areas.length).toBeGreaterThan(1); // Should have range areas
  });
});
