import { useAppStore } from "../stores/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PositionsGrid() {
  const { positions } = useAppStore();

  if (positions.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Live Positions</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="status-dot status-offline" />
            <span>No active positions</span>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No open positions. Bot is monitoring for entry signals.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Live Positions</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span className="status-dot status-online" />
          <span>Real-time updates</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {positions.map((position) => (
          <Card key={position.id} data-testid={`position-${position.symbol.replace('/', '-')}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-mono font-semibold">{position.symbol}</h3>
                  <Badge 
                    className={`${position.side === 'LONG' ? 'bg-chart-1' : 'bg-chart-2'} text-white`}
                  >
                    {position.side}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Unrealized P&L</div>
                  <div 
                    className={`font-mono font-semibold ${
                      (position.unrealizedPnl || 0) >= 0 ? 'profit' : 'loss'
                    }`}
                    data-testid={`pnl-${position.symbol.replace('/', '-')}`}
                  >
                    {(position.unrealizedPnl || 0) >= 0 ? '+' : ''}$
                    {(position.unrealizedPnl || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Entry Price</div>
                  <div className="font-mono">${position.entry.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Current Price</div>
                  <div className="font-mono">${(position.currentPrice || position.entry).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Quantity</div>
                  <div className="font-mono">{position.qty.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Stop Loss</div>
                  <div className="font-mono text-destructive">
                    ${(position.sl || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Duration: {position.duration || '0m'}</span>
                  <span>Trail: ${(position.trail || position.sl || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
