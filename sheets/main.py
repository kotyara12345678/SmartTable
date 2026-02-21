#!/usr/bin/env python3
"""
Main entry point for SmartTable application
Modern Spreadsheet Editor with PyQt6

Usage:
    python main.py           # Run with PyQt6 Modern UI (default)
    python main.py --legacy  # Run with old PyQt5 UI
"""

import sys
import os
import logging
import argparse
from pathlib import Path

# Настройка логирования
log_dir = Path.home() / ".smarttable"
log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_dir / "smarttable.log")
    ]
)

current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))
sys.path.insert(0, str(current_dir))


def init_database():
    """Инициализация базы данных"""
    try:
        from pysheets.src.db.database_manager import DatabaseManager
        db_manager = DatabaseManager()
        logging.info(f"Database initialized at: {db_manager.db_path}")
        db_info = db_manager.get_database_info()
        logging.info(f"Database info: {db_info}")
        return db_manager
    except Exception as e:
        logging.error(f"Database initialization error: {e}")
        return None


def main():
    """Application entry point"""
    parser = argparse.ArgumentParser(description='SmartTable Spreadsheet')
    parser.add_argument('--modern', action='store_true',
                       help='Use experimental PyQt6 UI')
    parser.add_argument('--theme', choices=['light', 'dark', 'system'], default='light',
                       help='Set theme (light/dark/system)')

    args = parser.parse_args()

    # Use stable PyQt5 UI by default
    if args.modern:
        print("⚠️  Warning: Modern UI is experimental")
        return run_modern_ui()
    else:
        # Run stable PyQt5 UI (default)
        return run_legacy_ui()


if __name__ == "__main__":
    sys.exit(main())
