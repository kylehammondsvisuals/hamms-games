#!/bin/bash
# One-time setup on the Brick Net server: from now on the server downloads the newest
# server/BrickWorkshopServer.pck from this repo every time it starts, so an update is just
# "upload the new file here, then press Restart on the server in Vultr".
set -e
cat > /opt/bricknet/update.sh <<'EOF'
#!/bin/bash
# Fetch the newest server build before starting; keep the current one if the download fails.
cd /opt/bricknet
if curl -fsSL --max-time 120 -o BrickWorkshopServer.pck.new https://raw.githubusercontent.com/kylehammondsvisuals/hamms-games/main/server/BrickWorkshopServer.pck \
		&& [ "$(stat -c%s BrickWorkshopServer.pck.new)" -gt 1000000 ]; then
	mv -f BrickWorkshopServer.pck.new BrickWorkshopServer.pck
	echo "Brick Net: server build updated"
else
	rm -f BrickWorkshopServer.pck.new
	echo "Brick Net: update download failed, keeping the current build"
fi
exit 0
EOF
chmod +x /opt/bricknet/update.sh
chown bricknet:bricknet /opt/bricknet/update.sh
mkdir -p /etc/systemd/system/bricknet.service.d
cat > /etc/systemd/system/bricknet.service.d/update.conf <<'EOF'
[Service]
ExecStartPre=/opt/bricknet/update.sh
TimeoutStartSec=180
EOF
DB="/opt/bricknet/.local/share/godot/app_userdata/Brick Workshop/bricknet_server.json"
[ -f "$DB" ] && cp -a "$DB" "/opt/bricknet/db-backup-$(date +%F-%H%M).json"
systemctl daemon-reload
systemctl restart bricknet
sleep 10
systemctl --no-pager status bricknet | head -12
echo "BRICKNET UPDATE DONE"
