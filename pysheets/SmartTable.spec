# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from pathlib import Path

# Определяем пути
pysheets_dir = Path(__file__).parent.absolute()

block_cipher = None

a = Analysis(
    [str(pysheets_dir / 'main.py')],
    pathex=[str(pysheets_dir)],
    binaries=[],
    datas=[
        (str(pysheets_dir / 'assets'), 'assets'),
        (str(pysheets_dir / 'templates'), 'templates'),
        (str(pysheets_dir / 'src'), 'pysheets/src'),
    ],
    hiddenimports=[
        'PyQt5.QtCore',
        'PyQt5.QtGui',
        'PyQt5.QtWidgets',
        'pysheets.src.ui',
        'pysheets.src.core',
        'pysheets.src.io',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SmartTable',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
