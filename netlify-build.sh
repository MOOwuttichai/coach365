#!/usr/bin/env bash
# รันบน Netlify ทุกครั้งที่ push: ก๊อปไฟล์แอปไป dist แล้วใส่เลขเวอร์ชัน (commit) ลงใน index.html และ version.txt
set -euo pipefail
V="${COMMIT_REF:-$(date +%s)}"
V="${V:0:12}"
rm -rf dist && mkdir dist
cp -r index.html style.css *.js manifest.webmanifest offline.html icons img dist/
sed -i "s/__APP_VERSION__/$V/" dist/index.html
echo "$V" > dist/version.txt
echo "Coach 365 version $V"
