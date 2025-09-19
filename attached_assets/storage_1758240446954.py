import sqlite3, os, time
from .config import settings

os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)

conn = sqlite3.connect(settings.DB_PATH, check_same_thread=False)
cur = conn.cursor()

cur.execute('''
CREATE TABLE IF NOT EXISTS trades(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER,
  symbol TEXT,
  side TEXT,
  qty REAL,
  entry REAL,
  sl REAL,
  trail REAL,
  status TEXT,
  pnl REAL DEFAULT 0.0
);
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS equity(
  ts INTEGER,
  equity REAL
);
''')

conn.commit()

def log_trade(symbol, side, qty, entry, sl, trail, status):
    cur.execute("INSERT INTO trades(ts,symbol,side,qty,entry,sl,trail,status) VALUES(?,?,?,?,?,?,?,?)",
                (int(time.time()), symbol, side, qty, entry, sl, trail, status))
    conn.commit()

def update_equity(equity: float):
    cur.execute("INSERT INTO equity(ts,equity) VALUES(?,?)", (int(time.time()), equity))
    conn.commit()

def get_latest_equity(default: float = 1000.0):
    cur.execute("SELECT equity FROM equity ORDER BY ts DESC LIMIT 1")
    row = cur.fetchone()
    return row[0] if row else default
