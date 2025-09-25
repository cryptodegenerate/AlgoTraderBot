import { Bot, Settings, Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "../stores/useAppStore";
import { useWebSocket } from "../hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { 
    botStatus, 
    botSettings, 
    currentEquity, 
    positions,
    tradeStats,
    setIsSettingsModalOpen 
  } = useAppStore();
  const { isConnected: wsConnected } = useWebSocket();
  
  // Use actual bot status instead of WebSocket connection
  const isBotRunning = botStatus?.isRunning || false;
  const { toast } = useToast();

  const handleBotControl = async (action: 'start' | 'pause' | 'kill') => {
    try {
      await apiRequest('POST', `/api/bot/${action}`);
      toast({
        title: "Success",
        description: `Bot ${action}ed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} bot`,
        variant: "destructive",
      });
    }
  };

  const dailyPnl = tradeStats.tradesToday > 0 ? 
    (Math.random() - 0.3) * currentEquity * 0.02 : 0; // Mock calculation

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <Bot className="text-primary text-2xl" />
          <h1 className="text-xl font-bold">Goose Alpha</h1>
          <span className="text-xs bg-secondary px-2 py-1 rounded">v1.0</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span 
              className={`status-dot ${isBotRunning ? 'status-online' : 'status-offline'}`}
              data-testid="connection-status"
            />
            <span className="text-sm text-muted-foreground">
              {isBotRunning ? 'Bot Running' : 'Bot Stopped'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Exchange: <span className="text-foreground font-medium" data-testid="exchange-name">
              {botSettings?.exchange || 'Binance'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 bg-secondary rounded-lg px-4 py-2">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Equity</div>
            <div className="font-mono font-semibold text-lg" data-testid="current-equity">
              ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Daily P&L</div>
            <div 
              className={`font-mono font-semibold text-lg ${dailyPnl >= 0 ? 'profit' : 'loss'}`}
              data-testid="daily-pnl"
            >
              {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Positions</div>
            <div className="font-mono font-semibold text-lg" data-testid="position-count">
              {positions.length}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            className="bg-chart-1 hover:bg-chart-1/80 text-white"
            size="sm"
            onClick={() => handleBotControl('start')}
            data-testid="button-start-bot"
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
          <Button 
            className="bg-accent hover:bg-accent/80 text-accent-foreground"
            size="sm"
            onClick={() => handleBotControl('pause')}
            data-testid="button-pause-bot"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button 
            className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
            size="sm"
            onClick={() => handleBotControl('kill')}
            data-testid="button-kill-bot"
          >
            <Square className="w-4 h-4 mr-2" />
            Kill
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => setIsSettingsModalOpen(true)}
            data-testid="button-open-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
