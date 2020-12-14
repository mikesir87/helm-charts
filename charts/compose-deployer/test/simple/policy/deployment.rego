package main

import data.shared

is_correct_deployment {
  input.kind = "Deployment"
  input.metadata.name = "nginx"
}

# Validate that we have a deployment
#deny[msg] {
#msg = json.marshal(input)
#}

# Validate the deployment name matches the service name
deny[msg] {
  input.kind = "Deployment"
  not input.metadata.name = "nginx"
  msg = sprintf("Deployment expected to have name 'nginx', but had '%s'", [input.metadata.name])
}

# Validate that all required labels are provided on the Deployment
deny[msg] {
  is_correct_deployment
  provided := {label | input.metadata.labels[label]}
  required := {label | label := shared.REQUIRED_LABELS[_]}
  missing := required - provided
  count(missing) > 0
  msg = sprintf("Deployment '%s' is missing required labels: %v", [input.metadata.name, missing])
}

# Validate that all required selector labels are provided on the Deployment's matcher
deny[msg] {
  is_correct_deployment
  provided := {label | input.spec.selector.matchLabels[label]}
  required := {label | label := shared.REQUIRED_SELECTOR_LABELS[_]}
  missing := required - provided
  count(missing) > 0
  msg = sprintf("Deployment '%s' is missing required selector labels: %v", [input.metadata.name, missing])
}

# Validate that all required labels are provided on the Deployment's pod template
deny[msg] {
  is_correct_deployment
  provided := {label | input.spec.template.metadata.labels[label]}
  required := {label | label := shared.REQUIRED_LABELS[_]}
  missing := required - provided
  count(missing) > 0
  msg = sprintf("Deployment '%s' is missing required labels on its pod template spec: %v", [input.metadata.name, missing])
}

# Validate the deployment is using the ServiceAccount
deny[msg] {
  is_correct_deployment
  input.spec.template.spec.serviceAccountName != "deployment-nginx"
  msg = sprintf("Deployment 'nginx' does not have the expected serviceAccountName specified", [])
}

# Validate only one container is on the Deployment spec
deny[msg] {
  is_correct_deployment
  count(input.spec.template.spec.containers) != 1
  msg = sprintf("Deployment '%s' expected to have 1 container, but had %v", [input.metadata.name, count(input.spec.template.spec.containers)])
}

# Validate that the container name matches the deployment name (which is the service name)
deny[msg] {
  is_correct_deployment
  containerName := input.spec.template.spec.containers[0].name
  containerName != input.metadata.name
  msg = sprintf("Deployment '%s' is expected to have a container with the name of '%s', but had '%s'", [input.metadata.name, input.metadata.name, containerName])
}

# Validate that the image name is set correctly on the container
deny[msg] {
  is_correct_deployment
  expectedContainerImage := "nginx:alpine"
  containerImage := input.spec.template.spec.containers[0].image
  containerImage != expectedContainerImage
  msg = sprintf("Deployment '%s' is expected to have a container with the image of '%s', but had '%s'", [input.metadata.name, expectedContainerImage, containerImage])
}
