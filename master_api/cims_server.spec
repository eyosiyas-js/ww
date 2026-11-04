# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

datas = []
if os.path.exists('alembic'):
    datas.append(('alembic', 'alembic'))
if os.path.exists('alembic.ini'):
    datas.append(('alembic.ini', '.'))

datas += collect_data_files('insightface')
datas += collect_data_files('onnxruntime')

hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'passlib.handlers.bcrypt',
    'psycopg2',
    'sqlalchemy.dialects.postgresql',
    'sqlalchemy.dialects.postgresql.psycopg2',
    'pgvector.sqlalchemy',
    'asyncpg',
    'databases',
    'dotenv',
]

hiddenimports += collect_submodules('app')
hiddenimports += collect_submodules('uvicorn')
hiddenimports += collect_submodules('passlib')

a = Analysis(
    ['run_server.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    excludes=['tkinter', 'IPython', 'notebook', 'pytest'],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='cims-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='cims-server',
)
