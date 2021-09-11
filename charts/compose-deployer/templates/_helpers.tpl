{{- define "convert_time_to_seconds" }}
{{- if hasSuffix "m" . -}}
{{- mul (. | replace "m" "") 60}}
{{- else if hasSuffix "s" . -}}
{{- . | replace "s" "" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "chart_name" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels applied to all resources
*/}}
{{- define "common_labels" -}}
{{- include "selector_labels" . }}
helm.sh/chart: {{ include "chart_name" .Root }}
{{- if .Root.Chart.AppVersion }}
app.kubernetes.io/version: {{ .Root.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Root.Release.Service }}
{{- if .Service }}
{{- if .Service.deploy }}
{{- if .Service.deploy.labels }}
{{ .Service.deploy.labels | toYaml }}
{{- end }}
{{- end }}
{{- end }}
{{- include "docker_project_labels" . }}
{{- end }} 

{{- define "docker_project_labels" -}}
{{- if index .Root.Values "x-docker-project" }}
com.docker.compose.project: {{ index .Root.Values "x-docker-project" }}
com.docker.compose.service: {{ .ServiceName }}
{{- end }}
{{- end }}

{{/*
Selector labels used for selecting (pulled into common labels)
*/}}
{{- define "selector_labels" -}}
{{- if .ServiceName -}}
app.kubernetes.io/name: {{ .ServiceName }}
{{- end }}
app.kubernetes.io/instance: {{ .Root.Release.Name }}
{{- end -}}

{{- define "certificate_secret_name" -}}
ingress-tls-{{ . }}
{{- end -}}

{{- define "healthcheck_spec" -}}
{{- if .test -}}
exec:
  command: 
    {{- slice .test 1 | toYaml | nindent 4 }}
{{- else if index . "x-httpGet" -}}
httpGet:
{{- index . "x-httpGet" | toYaml | nindent 2 }}
{{- end }}
{{- if .start_period }}
initialDelaySeconds: {{ template "convert_time_to_seconds" .start_period }}
{{- end }}
{{- if .interval }}
periodSeconds: {{ template "convert_time_to_seconds" .interval }}
{{- end }}
{{- if .timeout }}
timeoutSeconds: {{ template "convert_time_to_seconds" .timeout }}
{{- end }}
{{- if .retries }}
failureThreshold: {{ default 10 .retries }}
{{- end }}
{{- end }}

{{- define "image_pull_policy_converter" -}}
{{- if eq . "always" -}}
Always
{{- else if eq . "never" -}}
Never
{{- else if eq . "if_not_present" -}}
IfNotPresent
{{- else -}}
{{ required "Unrecognized pull_policy value" $.Values.missing }}
{{- end -}}
{{- end -}}

{{- define "service_type_mapping" -}}
{{- if eq . "ingress" -}}
LoadBalancer
{{- else if eq . "host" -}}
NodePort
{{- else -}}
ClusterIP
{{- end -}}
{{- end -}}

{{- define "ingress_backend" -}}
{{- if (.Root.Capabilities.APIVersions.Has "networking.k8s.io/v1") }}
service:
  name: {{ .ServiceName }}-{{ .Port.published | default .Port.target }}
  port:
    number: {{ .Port.published | default .Port.target }}
{{- else }}
serviceName: {{ .ServiceName }}-{{ .Port.published | default .Port.target }}
servicePort: {{ .Port.published | default .Port.target }}
{{- end }}
{{- end -}}

{{- define "pod_volumes" -}}
{{- range $index, $volumeDescriptor := .containerVolumes }}
{{- if kindIs "string" $volumeDescriptor }}
{{- $volumeConfig := mustRegexSplit ":" $volumeDescriptor -1 }}
{{- $src := index $volumeConfig 0 }}
{{- $dest := index $volumeConfig 1 }}
- name: volume-{{ $index }}
  {{- if hasPrefix "/" $src }}
  hostPath:
    path: {{ $src }}
  {{- else }}
  persistentVolumeClaim:
    {{- $volumeData := default dict (index $.volumeConfig $src) }}
    claimName: {{ default $src (index $volumeData "name")}}
  {{- end }}
{{- end }}
{{- end }}
{{- end -}}

{{- define "volume_mounts" -}}
{{- range $index, $volumeDescriptor := .containerVolumes }}
{{- if kindIs "string" $volumeDescriptor }}
{{- $volumeConfig := mustRegexSplit ":" $volumeDescriptor -1 }}
{{- $src := index $volumeConfig 0 }}
{{- $dest := index $volumeConfig 1 }}
- name: volume-{{ $index }}
  mountPath: {{ $dest }}
  {{- if hasPrefix "/" $src }}
  readOnly: true
  {{- end }}
{{- end }}
{{- end }}
{{- end -}}