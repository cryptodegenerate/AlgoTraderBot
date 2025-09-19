import asyncio
import os
import aiohttp
from .config import settings

async def send_telegram(text: str):
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }
    async with aiohttp.ClientSession() as s:
        await s.post(url, json=payload)
