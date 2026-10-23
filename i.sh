#!/bin/bash
clear
DB="/opt/bricknet/.local/share/godot/app_userdata/Brick Workshop/bricknet_server.json"
ls -la "$(dirname "$DB")" | head -12
python3 - "$DB" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
for k,u in d['users'].items():
    sv=u.get('save') or {}
    fr=[d['users'][f]['name'] if f in d['users'] else f+'?' for f in u.get('friends',[])]
    print(f"{k!r:20} {u['name']!r:18} xp={sv.get('xp',0):6} hamms={str(u.get('hamms',''))[:8]:8} {u.get('created','')[:16]} fr={fr}")
PY
