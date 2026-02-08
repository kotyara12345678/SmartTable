#!/bin/bash
# SmartTable Linux launcher script

# Activate venv if exists, else use system python
if [ -f "./.venv/bin/activate" ]; then
    source ./.venv/bin/activate
fi

# Install requirements if needed
echo "[SmartTable] Checking requirements..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r ./requirements.txt

# Run the app
python3 main.py
