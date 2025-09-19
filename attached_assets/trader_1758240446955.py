import asyncio, time, math
import pandas as pd
from .config import settings
from .exchange import create_exchange, unify_symbol
from .strategy import breakout_signal
from .risk import position_size
from .storage import log_trade, update_equity, get_latest_equity
from .telegram import send_telegram

class Trader:
    def __init__(self):
        self.exchange = create_exchange()
        self.symbols = settings.symbols_list
        self.timeframe = settings.TIMEFRAME
        self.equity = get_latest_equity(1000.0)
        self.daily_start_equity = self.equity
        self.open_positions = {}  # symbol -> dict

    async def fetch_ohlcv_df(self, symbol: str, limit: int = 400) -> pd.DataFrame:
        mkt = unify_symbol(symbol, self.exchange)
        o = await asyncio.to_thread(self.exchange.fetch_ohlcv, mkt, timeframe=self.timeframe, limit=limit)
        df = pd.DataFrame(o, columns=['time','open','high','low','close','volume'])
        df['time'] = pd.to_datetime(df['time'], unit='ms')
        return df

    async def maybe_reset_daily(self):
        # Reset daily at UTC midnight (simple check)
        now = time.gmtime()
        if now.tm_hour == 0 and now.tm_min < 2:
            self.daily_start_equity = self.equity

    def daily_dd_exceeded(self) -> bool:
        dd = (self.daily_start_equity - self.equity) / max(self.daily_start_equity, 1e-9)
        return dd >= settings.DAILY_MAX_DD

    async def run_symbol(self, symbol: str):
        while True:
            try:
                await self.maybe_reset_daily()
                if self.daily_dd_exceeded():
                    await send_telegram(f"🛑 Daily DD exceeded. Pausing entries for {symbol}.")
                    await asyncio.sleep(30)
                    continue

                df = await self.fetch_ohlcv_df(symbol, limit=max(settings.LOOKBACK, 200))
                sig = breakout_signal(df).iloc[-1]
                price = float(sig['close'])

                # Simple: If long signal and we don't already hold
                if sig['long'] and symbol not in self.open_positions and len(self.open_positions) < settings.MAX_CONCURRENT_POS:
                    atr = float(sig['atr']) if not math.isnan(sig['atr']) else price * 0.005
                    sl = price - settings.ATR_MULT_SL * atr
                    stop_dist = max(price - sl, price * 0.002)
                    qty = position_size(self.equity, stop_dist) / price
                    if qty <= 0:
                        await asyncio.sleep(5)
                        continue

                    if settings.DRY_RUN:
                        self.open_positions[symbol] = {"entry": price, "sl": sl, "qty": qty}
                        log_trade(symbol, "long", qty, price, sl, None, "OPEN")
                        await send_telegram(f"🟢 LONG {symbol} qty={qty:.4f} @ {price:.2f} SL={sl:.2f} (DRY_RUN)")
                    else:
                        # Place market order long
                        order = await asyncio.to_thread(self.exchange.create_market_buy_order, symbol, qty)
                        self.open_positions[symbol] = {"entry": price, "sl": sl, "qty": qty, "order_id": order.get('id')}
                        log_trade(symbol, "long", qty, price, sl, None, "OPEN")
                        await send_telegram(f"🟢 LIVE LONG {symbol} qty={qty:.4f} @ ~{price:.2f} SL={sl:.2f}")

                # Manage open position with simple trailing stop / SL hit (emulated in DRY_RUN)
                if symbol in self.open_positions:
                    pos = self.open_positions[symbol]
                    entry = pos['entry']; sl = pos['sl']; qty = pos['qty']
                    # Trail SL if price has moved favorably by ATR_MULT_TRAIL * atr
                    atr = float(sig['atr']) if not math.isnan(sig['atr']) else price * 0.005
                    new_sl = max(sl, price - settings.ATR_MULT_TRAIL * atr)
                    if new_sl > sl:
                        pos['sl'] = new_sl

                    # Exit if SL hit (emulated)
                    if price <= pos['sl']:
                        exit_price = pos['sl']
                        pnl = (exit_price - entry) * qty
                        self.equity += pnl
                        update_equity(self.equity)
                        log_trade(symbol, "long", qty, entry, pos['sl'], None, "CLOSED")
                        await send_telegram(f"🔴 EXIT {symbol} @ {exit_price:.2f} PnL={pnl:.2f} Eq={self.equity:.2f}")
                        del self.open_positions[symbol]

                await asyncio.sleep(5)
            except Exception as e:
                await send_telegram(f"⚠️ Error for {symbol}: {e}")
                await asyncio.sleep(5)

    async def run(self):
        tasks = [asyncio.create_task(self.run_symbol(sym)) for sym in self.symbols]
        await asyncio.gather(*tasks)
