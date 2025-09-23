import { useState } from "react";
import { X, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "../stores/useAppStore";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SettingsModal() {
  const { 
    isSettingsModalOpen, 
    setIsSettingsModalOpen, 
    botSettings, 
    setBotSettings 
  } = useAppStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState(botSettings || {
    exchange: "bybit",
    symbols: "BTC/USDT,ETH/USDT,SOL/USDT",
    timeframe: "1m",
    riskPerTrade: 0.0075,
    dailyMaxDD: 0.05,
    maxConcurrentPos: 2,
    hhvLen: 50,
    atrLen: 14,
    atrMultSL: 1.8,
    atrMultTrail: 2.2,
    volZMin: 2.0,
    lookback: 200,
    dryRun: true,
    telegramBotToken: "",
    telegramChatId: "",
    adminToken: ""
  });

  const getExchangePresets = (exchange: string) => {
    const presets: Record<string, any> = {
      bybit: {
        riskPerTrade: 0.0075,
        dailyMaxDD: 0.05,
        hhvLen: 50,
        atrLen: 14,
        atrMultSL: 1.8,
        atrMultTrail: 2.2,
        volZMin: 2.0,
        lookback: 200,
        symbols: "BTC/USDT,ETH/USDT,SOL/USDT"
      },
      okx: {
        riskPerTrade: 0.008,
        dailyMaxDD: 0.045,
        hhvLen: 45,
        atrLen: 16,
        atrMultSL: 1.7,
        atrMultTrail: 2.3,
        volZMin: 1.8,
        lookback: 180,
        symbols: "BTC/USDT,ETH/USDT,SOL/USDT"
      },
      kraken: {
        riskPerTrade: 0.012,
        dailyMaxDD: 0.04,
        hhvLen: 40,
        atrLen: 16,
        atrMultSL: 1.6,
        atrMultTrail: 2.1,
        volZMin: 1.9,
        lookback: 180,
        symbols: "BTC/USD,ETH/USD,SOL/USD"
      },
      binance: {
        riskPerTrade: 0.015,
        dailyMaxDD: 0.03,
        hhvLen: 35,
        atrLen: 12,
        atrMultSL: 1.5,
        atrMultTrail: 2.0,
        volZMin: 1.5,
        lookback: 150,
        symbols: "BTC/USDT,ETH/USDT,SOL/USDT,ASTER/USDT,PEPE/USDT,DOGE/USDT,SHIB/USDT,WIF/USDT"
      }
    };
    
    return presets[exchange] || presets.bybit;
  };

  const handleExchangeChange = (exchange: string) => {
    const presets = getExchangePresets(exchange);
    setFormData(prev => ({
      ...prev,
      exchange,
      ...presets
    }));
  };

  const handleSave = async () => {
    try {
      const response = await apiRequest('PUT', '/api/bot/settings', formData);
      const updatedSettings = await response.json();
      setBotSettings(updatedSettings);
      setIsSettingsModalOpen(false);
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleTestTelegram = async () => {
    try {
      await apiRequest('POST', '/api/telegram/test');
      toast({
        title: "Success",
        description: "Telegram connection test successful",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Telegram connection test failed",
        variant: "destructive",
      });
    }
  };

  if (!isSettingsModalOpen) return null;

  return (
    <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bot Configuration</DialogTitle>
          <DialogClose asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 top-4"
              data-testid="button-close-settings"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          {/* Exchange Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Exchange Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Select 
                value={formData.exchange} 
                onValueChange={handleExchangeChange}
              >
                <SelectTrigger data-testid="select-exchange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bybit">Bybit</SelectItem>
                  <SelectItem value="okx">OKX</SelectItem>
                  <SelectItem value="kraken">Kraken</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols</Label>
              <Input
                id="symbols"
                value={formData.symbols}
                onChange={(e) => setFormData({...formData, symbols: e.target.value})}
                className="font-mono"
                data-testid="input-symbols"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select 
                value={formData.timeframe} 
                onValueChange={(value) => setFormData({...formData, timeframe: value})}
              >
                <SelectTrigger data-testid="select-timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="dryRun"
                checked={formData.dryRun}
                onCheckedChange={(checked) => setFormData({...formData, dryRun: !!checked})}
                data-testid="checkbox-dry-run"
              />
              <Label htmlFor="dryRun">Dry Run Mode</Label>
            </div>
          </div>
          
          {/* Risk Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Risk Management</h3>
            
            <div className="space-y-2">
              <Label htmlFor="riskPerTrade">Risk Per Trade (%)</Label>
              <Input
                id="riskPerTrade"
                type="number"
                step="0.001"
                value={formData.riskPerTrade}
                onChange={(e) => setFormData({...formData, riskPerTrade: parseFloat(e.target.value)})}
                data-testid="input-risk-per-trade"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dailyMaxDD">Daily Max Drawdown (%)</Label>
              <Input
                id="dailyMaxDD"
                type="number"
                step="0.01"
                value={formData.dailyMaxDD}
                onChange={(e) => setFormData({...formData, dailyMaxDD: parseFloat(e.target.value)})}
                data-testid="input-daily-max-dd"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxConcurrentPos">Max Concurrent Positions</Label>
              <Input
                id="maxConcurrentPos"
                type="number"
                value={formData.maxConcurrentPos}
                onChange={(e) => setFormData({...formData, maxConcurrentPos: parseInt(e.target.value)})}
                data-testid="input-max-concurrent-pos"
              />
            </div>
          </div>
          
          {/* Strategy Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Strategy Parameters</h3>
            
            <div className="space-y-2">
              <Label htmlFor="hhvLen">HHV Length</Label>
              <Input
                id="hhvLen"
                type="number"
                value={formData.hhvLen}
                onChange={(e) => setFormData({...formData, hhvLen: parseInt(e.target.value)})}
                data-testid="input-hhv-len"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="atrLen">ATR Length</Label>
              <Input
                id="atrLen"
                type="number"
                value={formData.atrLen}
                onChange={(e) => setFormData({...formData, atrLen: parseInt(e.target.value)})}
                data-testid="input-atr-len"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="atrMultSL">ATR Stop Loss Multiplier</Label>
              <Input
                id="atrMultSL"
                type="number"
                step="0.1"
                value={formData.atrMultSL}
                onChange={(e) => setFormData({...formData, atrMultSL: parseFloat(e.target.value)})}
                data-testid="input-atr-mult-sl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="atrMultTrail">ATR Trail Multiplier</Label>
              <Input
                id="atrMultTrail"
                type="number"
                step="0.1"
                value={formData.atrMultTrail}
                onChange={(e) => setFormData({...formData, atrMultTrail: parseFloat(e.target.value)})}
                data-testid="input-atr-mult-trail"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="volZMin">Volume Z-Score Min</Label>
              <Input
                id="volZMin"
                type="number"
                step="0.1"
                value={formData.volZMin}
                onChange={(e) => setFormData({...formData, volZMin: parseFloat(e.target.value)})}
                data-testid="input-vol-z-min"
              />
            </div>
          </div>
          
          {/* Telegram Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Telegram Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="telegramBotToken">Bot Token</Label>
              <Input
                id="telegramBotToken"
                type="password"
                value={formData.telegramBotToken || ''}
                onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})}
                placeholder="Your bot token"
                className="font-mono"
                data-testid="input-telegram-bot-token"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telegramChatId">Chat ID</Label>
              <Input
                id="telegramChatId"
                value={formData.telegramChatId || ''}
                onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})}
                placeholder="Your chat ID"
                className="font-mono"
                data-testid="input-telegram-chat-id"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminToken">Admin Token</Label>
              <Input
                id="adminToken"
                type="password"
                value={formData.adminToken || ''}
                onChange={(e) => setFormData({...formData, adminToken: e.target.value})}
                placeholder="Admin access token"
                className="font-mono"
                data-testid="input-admin-token"
              />
            </div>
            
            <Button 
              onClick={handleTestTelegram}
              className="bg-[#0088cc] hover:bg-[#0088cc]/80 text-white w-full"
              data-testid="button-test-telegram"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Test Connection
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="secondary"
            onClick={() => setIsSettingsModalOpen(false)}
            data-testid="button-cancel-settings"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            data-testid="button-save-settings"
          >
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
