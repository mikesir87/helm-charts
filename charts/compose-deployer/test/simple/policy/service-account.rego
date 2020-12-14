package main

import data.shared

# Validate the ServiceAccount name
deny[msg] {
  input.kind = "ServiceAccount"
  not input.metadata.name = "deployment-nginx"
  msg = sprintf("ServiceAccount expect to have name 'deployment-nginx', but had'%s'", [input.metadata.name])
}
