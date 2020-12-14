#!/bin/bash
set -euxo pipefail

echo "Validate test dir ${TEST_DIR} for chart ${CHART}"

cd charts/${CHART}/test/${TEST_DIR}

helm template -f ./values.yaml ../../ > generated.yaml
cat generated.yaml

/tmp/conftest test generated.yaml
