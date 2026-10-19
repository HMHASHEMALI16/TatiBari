@echo off
cd /d "%~dp0"
python -m pip install --quiet pillow
python tools\build_catalog.py --push
pause
