# Compose Deployer Helm Chart

This helm chart provides the ability to specify a Compose file for the chart's `values.yaml` and it will be converted into Kubernetes resources. It provides direct conversion with support for a few additional components, such as Ingress and TLS certificates (using [cert-manager](https://cert-manager.io/)).

## Example

Given the following (very simple) Compose file, we can generate equivalent Kubernetes resources.

```yaml
services:
  app:
    image: nginx:alpine
    ports:
      - target: 80
        published: 80
        protocol: TCP
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      retries: 3
    deploy:
      mode: replicated
      replicas: 1
      resources:
        limits:
          cpus: 0.5
          memory: 50M
        reservations:
          cpus: 0.1
          memory: 20M
```

We can generate the resources by running the following:

```
helm template -f docker-compose.yml .
```

## Compose Compatibility

The following chart outlines the supported elements from the Compose spec. Before doing so, it is important to note the following considerations:

- Due to how pod-to-pod communication occurs in Kubernetes, _all_ container ports must be listed in the `ports` definition. If a port isn't defined, it won't be accessible over the pod network (a service needs to exist). See [Ports to Service type Mapping](#ports-to-service-type-mapping) below on how to specify the service type.
- By default, Kubernetes secrets are used, but can't be created/managed through this Helm chart. 

### Services Configuration


| Key | Supported? | Notes |
|-----|------------|-------|
| `blkio_config` | No | |
| `cpu_count`, `cpu_percent`, `cpu_shares`, `cpu_period`, `cpu_quota`, `cpu_rt_runtime`, `cpu_rt_period` | No | |
| `build` | No | No build support provided. All images must exist in a registry. |
| `cap_add`, `cap_drop` | Yes | |
| `cgroup_parent` | No | |
| `command` | Yes | |
| `configs` | Not yet | |
| `configs: short-syntax` | Not yet | |
| `configs: long-syntax` | Not yet | |
| `container_name` | Yes | |
| `credential_spec` | No | |
| `depends_on` | No | |
| `deploy` | Partial | See [Deploy Support](#deploy-configuration) below |
| `devices` | No | |
| `dns` | No | |
| `dns_opt` | No | |
| `dns_search` | No | |
| `domainname` | Yes | |
| `entrypoint` | Yes | |
| `env_file` | No | |
| `environment` | Partial | Only the map syntax is currently supported |
| `expose` | Not yet | |
| `extends` | No | |
| `external_links` | No | |
| `extra_hosts` | No | |
| `group_add` | Not yet | |
| `healthcheck` | Yes | When defined, it is used for both the `readinessProbe` and `livenessProbe`. All probes will use the `exec` option with the specified command |
| `hostname` | Yes | |
| `image` | Yes | |
| `init` | No | |
| `ipc` | No | |
| `isolation` | No | |
| `labels` | Not yet | |
| `links` | No | |
| `logging` | No | Going to only use the built-in k8s logging |
| `mac_address` | No | |
| `mem_swappiness` | No | |
| `memswap_limit` | No | |
| `network_mode` | No | Going to use built-in k8s networking |
| `networks` | Not yet | |
| `oom_kill_disable` | No | |
| `oom_score_adj` | No | |
| `pid` | Not yet | |
| `pids_limit` | No | |
| `platform` | No | |
| `ports` | Yes | All ports will create `ClusterIP` Services.  |
| `ports: short-syntax` | Yes | Only port declarations are supported (no specific IP addresses). If specifying only a single port, it _must_ be a String (wrapped in quotes). |
| `ports: long-syntax` | Yes | Recommended, as it provides support for ingress. See [Ports to Service type Mapping](#ports-to-service-type-mapping) below |
| `privileged` | Yes | |
| `pull_policy` | Yes | |
| `read_only` | Yes | |
| `restart` | Not yet | |
| `secrets` | Yes | All secrets must be `external` |
| `secrets: short-syntax` | Yes | Will mount secrets to `/run/secrets/<secret-name>` |
| `secrets: long-syntax` | Yes | Provides more configuration options |
| `security_opt` | No | |
| `shm_size` | No | |
| `stop_grace_period` | Yes | Supports time in `#m` and `#s`, but not in combinations (e.g. `1m30s`) |
| `stop_signal` | No | Not supported with k8s |
| `sysctls` | No | |
| `tmpfs` | Not yet | |
| `tty` | No | |
| `ulimits` | No | |
| `user` | Yes | Only supports UIDs, not usernames |
| `volumes` | Not yet | |
| `volumes_from` | No | |
| `working_dir` | Yes | |

### Deploy Configuration

| Key | Supported? | Notes |
|-----|------------|-------|
| `endpoint_mode` | No | |
| `labels` | Not yet | |
| `mode` | Partial | `replicated` will create a Deployment. Soon, `global` will create a DaemonSet |
| `placement` | Not yet | |
| `replicas` | Yes | |
| `resources` | Yes | Minus `devices` |
| `restart_policy` | Not yet | |
| `rollback_config` | Not yet | |
| `update_config` | Not yet | |


## Generated Kubernetes Resources

To help with debugging, the translation from Compose to Kubernetes will produce the following:

- For each defined service, a distinct `Deployment` and `ServiceAccount` is created
- For each exposed port defined in a service, a distinct `Service` is created. This supports the ability for each port to have a separate mode.
- For each defined port with ingress hosts defined, a unique `Certificate` is created with all names. The first is listed as the common name and all others are SANs. There is currently no ability to share certificates across ports/services.

For greater insight, simply use `helm template -f your-compose-file .` and view the generated resources.


## Additional Features and Support

The Compose spec does not provide support for all of the capabilities we would like to provide for the platform. But, through the use of extension fields (those that begin with `x-`), we can add our own features.

### Ports to Service type Mapping

In Kubernetes, all network communication goes through a `Service`, including pod-to-pod. The Compose spec was originally designed for local Docker Compose and Swarm environments, where ports used by container-to-container communications didn't need to be explicitly defined. A proposal has been made to add support to the spec ([follow along here](https://github.com/compose-spec/compose-spec/issues/117)). In the meantime, we are adding support (and defaulting) a third option for `ports.mode`.

```yaml
ports:
  - target: 80
    published: 80
    mode: internal
```

When using the other modes, they will be mapped as follows:

| ports.mode | Service type |
|------------|--------------|
| `internal` | `ClusterIP` (default) |
| `host`     | `NodePort` |
| `ingress`  | `LoadBalancer` |

### AWS IAM Role

Since many of our apps are being deployed onto AWS, this chart allows you to specify the IAM role that should be assumed (leveraging the [EKS Pod Identity Webhook](https://github.com/aws/amazon-eks-pod-identity-webhook)). Note that this requires additional setup (outside of the scope of this document) and usage of a current AWS SDK within the application. When configured correctly, the SDKs will automatically obtain STS tokens and assume the specified role.

To enable this support, add the following property as part of the service's `deploy` configuration:

| Property | Type | Description | Required? |
|----------|------|-------------|-----------|
| `x-aws-iam-role-arn` | `string` | The AWS ARN for the IAM role you wish your application to assume | Only if you want this feature |

#### Example Usage

```yaml
services:
  app:
    image: nginx:alpine
    deploy:
      x-aws-iam-role-arn: arn:aws:iam::123456789012:role/S3Access
```

### Defining Ingress and TLS Certificates

When providing the configuration for a port, ingress information can also be provided, including expected hostnames and paths. This will then create the appropriate `Ingress` and `Certificate` Kubernetes resources. Note that certificate requests are automatically going to happen at this moment and there is no support (yet) to share a certificate across multiple services that might be using the same hostname.

The following properties are supported under the `x-ingress` key on a port configuration:

| Property | Type | Description | Required? |
|----------|------|-------------|-----------|
| `hosts` | `string[]` | The hostnames that should forward traffic to this port | Yes |
| `cert_issuer` | `string` | The name of the `ClusterIssuer` that will issue the certs | No |
| `paths` | `string[]` | The paths that should forward traffic to this port (defaults to `["/"]`) | No |

**Note:** If the `hosts` are defined but no `cert_issuer`, only the appropriate `Ingress` objects will be created.
**Note 2:** If a `cert_issuer` is defined but cert-manager is not deployed, no `Certificate` objects will be produced.

#### Example Usage 

```yaml
services:
  app:
    image: nginx:alpine
    ports:
      - target: 80
        published: 80
        protocol: TCP
        x-ingress:
          hosts:
            - app.example.com
          paths:
            - /
          cert_issuer: letsencrypt
```

## Contributing

If you wish to contribute to this chart, open an issue! Note that not all feature requests will be accepted, as we are trying to focus on core resources and _very_ common use cases.

## Extending the Chart

Due to the nature of this chart, it's hard to extend the capabilities directly using subcharting (e.g., to add additional annotations). If you know of ways to make extending easier via subcharts, start a discussion! Until then, you basically have two options:

1. Fork the chart and adjust the templates to meet your needs.
1. Use Helm's [post rendering hooks](https://helm.sh/docs/topics/advanced/#post-rendering) to manipulate, patch, add, or remove resources before being applied.
