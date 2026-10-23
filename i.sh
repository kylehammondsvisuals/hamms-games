#!/bin/bash
clear
echo "== services"; systemctl list-units --type=service --no-pager | grep -iE "brick|godot|bn" 
for f in /etc/systemd/system/*.service; do grep -l -iE "brick|godot" "$f" 2>/dev/null; done | while read f; do echo "-- $f"; grep -E "ExecStart|WorkingDirectory|User=" "$f"; done
echo "== procs"; ps -eo pid,etime,args | grep -iE "godot|brick" | grep -v grep | cut -c1-160
echo "== /opt/bricknet"; ls -la /opt/bricknet | head -20
DB=$(find / -name bricknet_server.json -not -path "*/proc/*" 2>/dev/null | head -3); echo "== db: $DB"
for d in $DB; do ls -la "$d"; python3 - "$d" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
for k,u in d['users'].items():
    sv=u.get('save') or {}
    print(f"{k!r:22} name={u['name']!r:20} xp={sv.get('xp',0):6} hamms={str(u.get('hamms',''))[:10]:10} fr={len(u.get('friends',[]))} created={u.get('created','')[:16]}")
PY
done
df -h / | tail -1
