#!/bin/bash
set -euxo pipefail

wget https://github.com/open-policy-agent/conftest/releases/download/v0.21.0/conftest_0.21.0_Linux_x86_64.tar.gz
tar xzf conftest_0.21.0_Linux_x86_64.tar.gz
mv conftest /tmp/conftest
