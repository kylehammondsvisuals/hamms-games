# HAMMS Studios Store

This repo is the store behind the **HAMMS Studios launcher**. Everything players see (the game list, artwork, specs, downloads, and patch notes) comes from here. Change something here, and every launcher picks it up within minutes.

You never have to edit `catalog.json` yourself. A GitHub Action rebuilds it automatically whenever you change a game folder or post a release.

---

## Put out a game update (or a game's first release)

1. Export the game from Godot or Unreal, right-click the export folder, and choose **Send to → Compressed (zipped) folder**.
2. On GitHub, open this repo and go to **Releases → Draft a new release**.
3. **Choose a tag:** type it exactly like this, then click *Create new tag*:
   - `sweetfang-v1.0.4` for the normal (High) build
   - `sweetfang-lite-v1.0.4` for the **Low Spec** build
4. **Release title:** anything, for example `Sweetfang 1.0.4`.
5. **Description:** your patch notes, one per line starting with `-`:
   ```
   - Mochi can glide in Fang form
   - New land: the Sugar Mill
   - Fixed the double jump on slopes
   ```
6. Drag the `.zip` into the box at the bottom, wait for the upload to finish, then click **Publish release**.

That's it. About a minute later the store updates. Players get **UPDATE** on the Play button and can't play the old version until they download the new one.

- The version number must go up each time (1.0.3 → 1.0.4).
- Each file can be up to **2 GB**.
- Game ids: `sweetfang`, `brick-workshop`, `glint`, `off-the-books`, `battle-vox`, `wasteland`, `bit-bash-2026`, `dash-pack`.

### Low Spec builds
Upload a release tagged `<game>-lite-v<version>`. Players whose PC is below the game's minimum specs are pointed to Low Spec automatically, and anyone can switch between **High** and **Low Spec** on the game's page.

---

## Add a brand-new game to the store

1. Copy one of the folders in `games/` (for example `games/sweetfang`) and rename the copy to the new game's id: lowercase with dashes, like `night-shoot`.
2. Replace the images, keeping the same file names:
   | File | Size | Used for |
   |---|---|---|
   | `cover.jpg` | 600 × 800 | Store cards |
   | `banner.jpg` | 1600 × 900 | Thumbnails, screenshot gallery |
   | `hero.jpg` *(optional)* | 2000 × 844 | Big header art (falls back to banner) |
   | `logo.png` | transparent, up to 900 wide | Title logo over the art |
   | `screenshot-1.jpg` … | 1600 × 900 | Gallery |
   | `trailer.mp4` *(optional)* | 720p or 1080p, under 50 MB | Trailer button |
3. Edit `game.json`: title, description, features, genres, specs, and the name of the game's `.exe` (`executable`).
4. Upload the folder: **Add file → Upload files**, drag the folder in, then **Commit**.

The game shows up in everyone's store as **Coming soon**, and switches to **Install** as soon as you post its first release.

### Web games (play inside the launcher)
Set `"type": "web"` and put the game's link in `"playUrl"`. An empty `playUrl` means Coming soon.

### Partner games
Put the folder in `partners/` instead of `games/` and set `"publisher"` to the partner studio's name. It appears under **Partner Games** in the store.

---

## System requirements
Each `game.json` has `requirements.minimum` and `requirements.recommended`. The text fields are what players read. The `check` block is what the launcher actually tests against the player's PC:
```json
"check": { "ramGB": 8, "cores": 4, "dedicatedGPU": true }
```
The specs filled in now are starting estimates. Adjust them once you've tested on real machines.

---

## Featured games
`"featured": true` puts a game in the big rotating banner at the top of the store. `"order"` controls the order of the store rows (1 comes first).
