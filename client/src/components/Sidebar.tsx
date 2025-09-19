import { BarChart3, History, Shield, MessageSquare, Settings, Activity } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

const navigation = [
  { name: 'Dashboard', href: '#', icon: BarChart3, current: true },
  { name: 'Trade History', href: '#', icon: History, current: false },
  { name: 'Risk Management', href: '#', icon: Shield, current: false },
  { name: 'Telegram', href: '#', icon: MessageSquare, current: false },
  { name: 'Settings', href: '#', icon: Settings, current: false },
];

export function Sidebar() {
  const { botSettings, tradeStats, currentView, setCurrentView, setIsSettingsModalOpen } = useAppStore();
  const symbols = botSettings?.symbols?.split(',') || ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];

  const handleNavClick = (viewName: string) => {
    const viewId = viewName.toLowerCase().replace(' ', '-');
    if (viewId === 'settings') {
      setIsSettingsModalOpen(true);
    } else {
      setCurrentView(viewId);
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
      <nav className="space-y-2">
        {navigation.map((item) => {
          const viewId = item.name.toLowerCase().replace(' ', '-');
          const isActive = viewId === currentView || (viewId === 'dashboard' && currentView === 'dashboard');
          
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.name)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Symbols</h3>
        <div className="space-y-2">
          {symbols.map((symbol, index) => (
            <div 
              key={symbol}
              className="flex items-center justify-between p-2 rounded bg-secondary"
              data-testid={`symbol-${symbol.replace('/', '-')}`}
            >
              <span className="font-mono text-sm">{symbol}</span>
              <div className="flex items-center space-x-2">
                <span className={`status-dot ${index === 2 ? 'status-warning' : 'status-online'}`} />
                <span className="text-xs text-muted-foreground">
                  {index === 2 ? 'Paused' : 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Stats</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="font-mono" data-testid="stat-win-rate">
              {tradeStats.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Hold</span>
            <span className="font-mono" data-testid="stat-avg-hold">
              {tradeStats.avgHoldTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max DD</span>
            <span className="font-mono text-destructive" data-testid="stat-max-drawdown">
              -{tradeStats.maxDrawdown.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trades Today</span>
            <span className="font-mono" data-testid="stat-trades-today">
              {tradeStats.tradesToday}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
