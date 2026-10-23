#!/bin/bash
# Brick Net self-update: every few minutes, check the published server build; when it
# changes, back up the database, install it, restart, and roll back if it won't start.
B=https://raw.githubusercontent.com/kylehammondsvisuals/hamms-games/bricknet-tools/server
D=/opt/bricknet
DBDIR="$D/.local/share/godot/app_userdata/Brick Workshop"
NEW=$(curl -fsSL "$B/sha256?$(date +%s)" | tr -d '[:space:]') || exit 0
[ ${#NEW} -eq 64 ] || exit 0
[ "$NEW" = "$(cat $D/installed.sha 2>/dev/null)" ] && exit 0
T=$(mktemp -d); trap 'rm -rf $T' EXIT
curl -fsSL "$B/BrickWorkshopServer.pck.gz?$(date +%s)" -o $T/s.pck.gz || exit 1
gunzip -f $T/s.pck.gz || exit 1
[ "$(sha256sum $T/s.pck | cut -d' ' -f1)" = "$NEW" ] || { echo "bricknet update: checksum mismatch"; exit 1; }
systemctl stop bricknet
cp "$DBDIR/bricknet_server.json" "$DBDIR/bricknet_server.backup-$(date +%Y%m%d-%H%M%S).json" 2>/dev/null
ls -1t "$DBDIR"/bricknet_server.backup-*.json 2>/dev/null | tail -n +21 | xargs -r rm -f
cp $D/BrickWorkshopServer.pck $D/BrickWorkshopServer.pck.prev
install -o bricknet -g bricknet -m 644 $T/s.pck $D/BrickWorkshopServer.pck
systemctl start bricknet; sleep 8
if systemctl is-active --quiet bricknet; then
  echo "$NEW" > $D/installed.sha; echo "bricknet update: installed $NEW"
else
  echo "bricknet update: new build failed to start, rolling back"
  cp $D/BrickWorkshopServer.pck.prev $D/BrickWorkshopServer.pck; systemctl start bricknet
fi
