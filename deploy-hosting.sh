#!/bin/bash
# Deploy frontend/dist to Firebase Hosting via REST using gcloud token
set -e; export PATH=$HOME/google-cloud-sdk/bin:$PATH; P=${1:-gh-curriculum-f31c9}; T=$(gcloud auth print-access-token)
H=(-H "Authorization: Bearer $T" -H "x-goog-user-project: $P" -H "Content-Type: application/json"); A=https://firebasehosting.googleapis.com/v1beta1
V=$(curl -s "${H[@]}" -X POST $A/sites/$P/versions -d '{"config":{"rewrites":[{"glob":"**","path":"/index.html"}]}}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["name"])')
G=$(mktemp -d); cd "$(dirname "$0")/frontend/dist"; declare -A M; files="{"
for f in $(find . -type f | sed 's|^\./||'); do mkdir -p $G/$(dirname $f); gzip -cn $f > $G/$f.gz; h=$(sha256sum $G/$f.gz|cut -d' ' -f1); M[$h]=$f; files+="\"/$f\":\"$h\","; done
R=$(curl -s "${H[@]}" -X POST "$A/$V:populateFiles" -d "{\"files\":${files%,}}}")
U=$(echo "$R"|python3 -c 'import sys,json;print(json.load(sys.stdin)["uploadUrl"])')
for h in $(echo "$R"|python3 -c 'import sys,json;print(" ".join(json.load(sys.stdin).get("uploadRequiredHashes",[])))'); do curl -sf -o /dev/null -H "Authorization: Bearer $T" -H "Content-Type: application/octet-stream" --data-binary @$G/${M[$h]}.gz $U/$h; done
curl -s "${H[@]}" -X PATCH "$A/$V?update_mask=status" -d '{"status":"FINALIZED"}' >/dev/null
curl -s "${H[@]}" -X POST "$A/sites/$P/releases?versionName=$V" -d '{}' | grep -oE '"releaseTime": "[^"]*"'; echo "$V"
