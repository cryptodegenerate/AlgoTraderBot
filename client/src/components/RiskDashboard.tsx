import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "../stores/useAppStore";

export function RiskDashboard() {
  const { botSettings, positions, currentEquity, tradeStats } = useAppStore();

  const dailyDrawdown = Math.min(tradeStats.maxDrawdown, botSettings?.dailyMaxDD || 5) / (botSettings?.dailyMaxDD || 5) * 100;
  const positionUtilization = positions.length / (botSettings?.maxConcurrentPos || 2) * 100;
  // Calculate actual available capital based on open positions
  const capitalAtRisk = positions.reduce((total, position) => {
    return total + Math.abs(position.qty * position.entry);
  }, 0);
  const availableCapital = currentEquity - capitalAtRisk;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Daily Drawdown</span>
            <span className="font-mono" data-testid="daily-drawdown">
              -{tradeStats.maxDrawdown.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(dailyDrawdown, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            Max: <span data-testid="max-drawdown-limit">{botSettings?.dailyMaxDD || 5}%</span>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Position Utilization</span>
            <span className="font-mono" data-testid="position-utilization">
              {positions.length}/{botSettings?.maxConcurrentPos || 2}
            </span>
          </div>
          <Progress value={positionUtilization} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            Max Concurrent: <span data-testid="max-positions">{botSettings?.maxConcurrentPos || 2}</span>
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className="text-sm text-muted-foreground mb-2">Risk Per Trade</div>
          <div className="font-mono text-lg" data-testid="risk-per-trade">
            {((botSettings?.riskPerTrade || 0.0075) * 100).toFixed(2)}%
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className="text-sm text-muted-foreground mb-2">Available Capital</div>
          <div className="font-mono text-lg" data-testid="available-capital">
            ${availableCapital.toFixed(2)}
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className="bg-secondary rounded p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-chart-1" />
              <span className="text-sm font-medium">Protection Active</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Daily kill-switch monitoring enabled
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
