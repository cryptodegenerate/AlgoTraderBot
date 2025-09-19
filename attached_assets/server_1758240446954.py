from fastapi import FastAPI, Header, HTTPException
from .config import settings
from .storage import get_latest_equity
from .trader import Trader

app = FastAPI()
trader: Trader | None = None

@app.on_event("startup")
async def startup():
    global trader
    trader = Trader()

@app.get("/status")
async def status():
    return {
        "exchange": settings.EXCHANGE,
        "symbols": settings.symbols_list,
        "timeframe": settings.TIMEFRAME,
        "dry_run": settings.DRY_RUN,
        "equity": get_latest_equity(1000.0),
        "open_positions": list(trader.open_positions.keys()) if trader else []
    }

@app.post("/kill")
async def kill(admin_token: str | None = Header(default=None)):
    if settings.ADMIN_TOKEN and admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    trader.open_positions.clear()
    return {"ok": True, "msg": "Closed positions halted. (New entries paused by operator discretion.)"}
