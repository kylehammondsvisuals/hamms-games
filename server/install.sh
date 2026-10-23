#!/bin/bash
# One-time: install the self-updater (systemd timer, every 3 minutes) and update right now.
B=https://raw.githubusercontent.com/kylehammondsvisuals/hamms-games/bricknet-tools/server
curl -fsSL "$B/auto_update.sh?$(date +%s)" -o /opt/bricknet/auto_update.sh && chmod 755 /opt/bricknet/auto_update.sh
cat > /etc/systemd/system/bricknet-update.service <<'U'
[Unit]
Description=Brick Net self-update
[Service]
Type=oneshot
ExecStart=/opt/bricknet/auto_update.sh
U
cat > /etc/systemd/system/bricknet-update.timer <<'U'
[Unit]
Description=Check for a new Brick Net server build
[Timer]
OnBootSec=2min
OnUnitActiveSec=3min
[Install]
WantedBy=timers.target
U
systemctl daemon-reload
systemctl enable --now bricknet-update.timer
clear
/opt/bricknet/auto_update.sh
systemctl --no-pager status bricknet | head -4
journalctl -u bricknet -n 12 --no-pager | cut -c1-150
systemctl list-timers --no-pager | grep bricknet
