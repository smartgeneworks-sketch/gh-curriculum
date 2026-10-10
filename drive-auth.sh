#!/bin/bash
# Run interactively (user must open URL and paste code). Grants Drive (app-created files only) + cloud-platform to ADC.
export PATH=$HOME/google-cloud-sdk/bin:$PATH
gcloud auth application-default login --no-launch-browser \
  --scopes=https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/cloud-platform,openid,https://www.googleapis.com/auth/userinfo.email
gcloud auth application-default set-quota-project gh-curriculum-f31c9
