![Lint and Test Charts](https://github.com/mikesir87/helm-charts/workflows/Lint%20and%20Test%20Charts/badge.svg?branch=main)

# Helm Charts

This repo contains the various Helm charts I've created and am maintaining.

## Setup

The repo is available at the host [https://charts.mikesir87.io](https://charts.mikesir87.io).

```cli
helm repo add mikesir87 https://charts.mikesir87.io
helm repo update
```

## Available Charts

- [Compose Deployer](./compose-deployer) - converts a Compose file to Kubernetes resources via a Helm chart
