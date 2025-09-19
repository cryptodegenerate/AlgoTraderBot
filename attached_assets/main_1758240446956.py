import asyncio, os
import uvicorn
from app.server import app, Trader

async def start_trader():
    # server.startup hook initializes Trader, but we need to run its loop
    from app.server import trader
    while trader is None:
        await asyncio.sleep(0.1)
    await trader.run()

async def main():
    server = uvicorn.Server(config=uvicorn.Config(app=app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), log_level="info"))
    trader_task = asyncio.create_task(start_trader())
    await server.serve()
    trader_task.cancel()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
