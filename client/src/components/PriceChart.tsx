import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "../stores/useAppStore";

const timeframes = ['1m', '5m', '15m', '1h'];

export function PriceChart() {
  const { selectedSymbol, selectedTimeframe, setSelectedTimeframe } = useAppStore();
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  // Mock chart implementation - in a real app this would use TradingView or Recharts
  const renderChart = () => {
    return (
      <div className="h-64 bg-secondary rounded flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-semibold mb-2">
            {selectedSymbol} Price Chart
          </div>
          <div className="text-sm">
            Chart implementation with {selectedTimeframe} timeframe
          </div>
          <div className="text-xs mt-2">
            Connect to TradingView widget or implement with Recharts
          </div>
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
