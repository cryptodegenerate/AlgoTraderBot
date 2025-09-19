import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useAppStore } from "../stores/useAppStore";
import { useWebSocket } from "../hooks/useWebSocket";

const timeframes = ['1m', '5m', '15m', '1h'];

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  timestamp: number;
}

export function PriceChart() {
  const { selectedSymbol, selectedTimeframe, setSelectedTimeframe } = useAppStore();
  const { lastMessage } = useWebSocket();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  // Initialize with some baseline data
  useEffect(() => {
    const initialData: ChartDataPoint[] = [];
    const basePrice = 43000;
    const now = Date.now();
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const variation = (Math.random() - 0.5) * 1000;
      initialData.push({
        time: new Date(timestamp).toLocaleTimeString(),
        price: basePrice + variation,
        volume: Math.random() * 1000000 + 500000,
        timestamp
      });
    }
    
    setChartData(initialData);
  }, [selectedSymbol]);

  // Update chart data with WebSocket price updates
  useEffect(() => {
    if (lastMessage?.type === 'price_update' && lastMessage.data?.symbol === selectedSymbol) {
      const newDataPoint: ChartDataPoint = {
        time: new Date(lastMessage.data.timestamp).toLocaleTimeString(),
        price: lastMessage.data.price,
        volume: Math.random() * 1000000 + 500000, // Mock volume for now
        timestamp: lastMessage.data.timestamp
      };
      
      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 100 data points for performance
        return updated.slice(-100);
      });
      
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [lastMessage, selectedSymbol]);

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-64 bg-secondary rounded flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            Loading chart data...
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Price Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={['dataMin - 100', 'dataMax + 100']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Volume Chart */}
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Volume']}
              />
              <Bar 
                dataKey="volume" 
                fill="hsl(var(--muted-foreground))" 
                opacity={0.6}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{selectedSymbol} - {selectedTimeframe}</CardTitle>
          <div className="flex space-x-2">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTimeframe(tf)}
                data-testid={`timeframe-${tf}`}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
        
        <div className="mt-4 flex justify-between text-sm">
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-chart-1 rounded" />
              <span className="text-muted-foreground">Long Signals</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-destructive rounded" />
              <span className="text-muted-foreground">Stop Loss</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-accent rounded" />
              <span className="text-muted-foreground">Breakout Level</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            Last Update: <span data-testid="chart-last-update">{lastUpdate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
