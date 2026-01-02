#!/usr/bin/env python3
"""
Emporia Vue Sync Worker for HomeTracker

Lightweight Python process that:
- Polls Emporia Vue API every 2 seconds
- Writes raw power readings to SQLite
- Outputs JSON to stdout for Node.js to optionally capture

Node.js handles everything else (learning, alerts, UI).
"""

import os
import sys
import time
import json
import sqlite3
import logging
from datetime import datetime
from typing import Optional, Tuple, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Try to import PyEmVue
try:
    from pyemvue import PyEmVue
    from pyemvue.enums import Scale
    PYEMVUE_AVAILABLE = True
except ImportError:
    logger.warning("PyEmVue not installed. Running in demo mode.")
    PYEMVUE_AVAILABLE = False

# Configuration
DB_PATH = os.environ.get('DB_PATH', '/app/backend/data/hometracker.db')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '2'))
DEMO_MODE = os.environ.get('DEMO_MODE', 'false').lower() == 'true'


def get_db_connection() -> sqlite3.Connection:
    """Create database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_credentials(db: sqlite3.Connection) -> Tuple[Optional[str], Optional[str]]:
    """Read Emporia credentials from power_config table."""
    try:
        cur = db.execute("SELECT key, value FROM power_config WHERE key IN ('emporia_email', 'emporia_password')")
        rows = {row['key']: row['value'] for row in cur.fetchall()}
        return rows.get('emporia_email'), rows.get('emporia_password')
    except sqlite3.OperationalError:
        # Table doesn't exist yet
        return None, None


def get_device_gid(db: sqlite3.Connection) -> Optional[str]:
    """Get configured device GID from power_config."""
    try:
        cur = db.execute("SELECT value FROM power_config WHERE key = 'device_gid'")
        row = cur.fetchone()
        return row['value'] if row else None
    except sqlite3.OperationalError:
        return None


def save_device_gid(db: sqlite3.Connection, device_gid: str) -> None:
    """Save device GID to power_config."""
    db.execute("""
        INSERT OR REPLACE INTO power_config (key, value, updated_at)
        VALUES ('device_gid', ?, datetime('now'))
    """, (device_gid,))
    db.commit()


def store_reading(db: sqlite3.Connection, ts: int, total: float,
                  phase_a: Optional[float], phase_b: Optional[float],
                  circuits: Dict[str, float]) -> None:
    """Store a power reading in the database."""
    db.execute("""
        INSERT INTO power_readings_raw (ts, total, phase_a, phase_b, circuits)
        VALUES (?, ?, ?, ?, ?)
    """, (ts, total, phase_a, phase_b, json.dumps(circuits)))
    db.commit()


def update_learning_status(db: sqlite3.Connection, ts: int) -> None:
    """Update learning status with new reading."""
    db.execute("""
        UPDATE power_learning_status SET
            first_reading_ts = COALESCE(first_reading_ts, ?),
            total_readings = total_readings + 1,
            last_updated = datetime('now')
        WHERE id = 1
    """, (ts,))
    db.commit()


def emit_json(data: Dict[str, Any]) -> None:
    """Output JSON to stdout for Node.js to capture."""
    print(json.dumps(data), flush=True)


def poll_emporia(vue: 'PyEmVue', device_gid: str, db: sqlite3.Connection) -> bool:
    """Poll Emporia API and store reading. Returns True on success."""
    try:
        # Get instant power usage
        devices = vue.get_device_list_usage(
            deviceGids=[int(device_gid)],
            instant=True,
            scale=Scale.SECOND.value
        )

        if not devices:
            emit_json({'error': 'no_device_data', 'device_gid': device_gid})
            return False

        device = devices[0]
        ts = int(time.time())

        # Parse channel data
        total = 0.0
        phase_a = None
        phase_b = None
        circuits: Dict[str, float] = {}

        for channel in device.channels:
            usage = channel.usage or 0.0
            channel_num = channel.channel_num

            # Identify main channels
            if channel_num == '1,2,3':  # Total (all phases)
                total = usage
            elif channel_num == '1,2':  # Phase A (or first main)
                phase_a = usage
            elif channel_num == '3,4':  # Phase B (or second main)
                phase_b = usage
            elif channel.name and usage > 0:
                # Individual circuit
                circuits[channel.name] = usage

        # Store reading
        store_reading(db, ts, total, phase_a, phase_b, circuits)
        update_learning_status(db, ts)

        # Emit for Node.js
        emit_json({
            'type': 'reading',
            'ts': ts,
            'total': round(total, 2),
            'phase_a': round(phase_a, 2) if phase_a else None,
            'phase_b': round(phase_b, 2) if phase_b else None,
            'circuits': {k: round(v, 2) for k, v in circuits.items()}
        })

        return True

    except Exception as e:
        emit_json({'error': str(e), 'type': 'poll_error'})
        return False


def generate_demo_reading(db: sqlite3.Connection) -> None:
    """Generate fake reading for demo/testing."""
    import random

    ts = int(time.time())
    base_load = 800 + random.uniform(-100, 100)

    # Simulate some variation
    hour = datetime.now().hour
    if 6 <= hour <= 9 or 17 <= hour <= 21:
        base_load += random.uniform(200, 500)  # Peak hours

    total = base_load
    phase_a = total * 0.55 + random.uniform(-50, 50)
    phase_b = total * 0.45 + random.uniform(-50, 50)

    circuits = {
        'HVAC': random.uniform(100, 400) if random.random() > 0.3 else 0,
        'Kitchen': random.uniform(50, 200),
        'Living Room': random.uniform(20, 80),
        'Office': random.uniform(30, 150),
    }

    store_reading(db, ts, total, phase_a, phase_b, circuits)
    update_learning_status(db, ts)

    emit_json({
        'type': 'reading',
        'demo': True,
        'ts': ts,
        'total': round(total, 2),
        'phase_a': round(phase_a, 2),
        'phase_b': round(phase_b, 2),
        'circuits': {k: round(v, 2) for k, v in circuits.items()}
    })


def main() -> None:
    """Main worker loop."""
    logger.info("Emporia Worker starting...")
    logger.info(f"Database: {DB_PATH}")
    logger.info(f"Poll interval: {POLL_INTERVAL}s")
    logger.info(f"Demo mode: {DEMO_MODE}")
    logger.info(f"PyEmVue available: {PYEMVUE_AVAILABLE}")

    db = get_db_connection()
    vue = None
    device_gid = None
    consecutive_failures = 0

    while True:
        try:
            # Demo mode - generate fake data
            if DEMO_MODE or not PYEMVUE_AVAILABLE:
                generate_demo_reading(db)
                time.sleep(POLL_INTERVAL)
                continue

            # Check for credentials
            email, password = get_credentials(db)

            if not email or not password:
                emit_json({'status': 'waiting_for_config', 'message': 'Emporia credentials not configured'})
                time.sleep(30)
                continue

            # Initialize connection if needed
            if vue is None:
                logger.info("Connecting to Emporia...")
                emit_json({'status': 'connecting'})

                vue = PyEmVue()
                vue.login(username=email, password=password)

                # Get device GID
                device_gid = get_device_gid(db)

                if not device_gid:
                    # Auto-discover first device
                    devices = vue.get_devices()
                    if devices:
                        device_gid = str(devices[0].device_gid)
                        save_device_gid(db, device_gid)
                        logger.info(f"Auto-selected device: {device_gid}")
                    else:
                        emit_json({'error': 'no_devices_found'})
                        time.sleep(60)
                        vue = None
                        continue

                emit_json({
                    'status': 'connected',
                    'device_gid': device_gid,
                    'message': 'Connected to Emporia Vue'
                })
                consecutive_failures = 0

            # Poll for data
            success = poll_emporia(vue, device_gid, db)

            if success:
                consecutive_failures = 0
            else:
                consecutive_failures += 1

                # Too many failures, reconnect
                if consecutive_failures >= 5:
                    logger.warning("Too many failures, reconnecting...")
                    vue = None
                    consecutive_failures = 0
                    time.sleep(10)
                    continue

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            logger.info("Shutting down...")
            break

        except Exception as e:
            logger.error(f"Error: {e}")
            emit_json({'error': str(e), 'retry_in': 60})
            vue = None
            time.sleep(60)

    db.close()


if __name__ == '__main__':
    main()
