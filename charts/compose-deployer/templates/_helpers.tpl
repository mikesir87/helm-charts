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
{{- if .Service.deploy }}
{{- if .Service.deploy.labels }}
{{ .Service.deploy.labels | toYaml }}
{{- end }}
{{- end }}
{{- end }} 

{{/*
Selector labels used for selecting (pulled into common labels)
*/}}
{{- define "selector_labels" -}}
app.kubernetes.io/name: {{ .ServiceName }}
app.kubernetes.io/instance: {{ .Root.Release.Name }}
{{- end -}}

{{- define "certificate_secret_name" -}}
ingress-tls-{{ . }}
{{- end -}}

{{- define "healthcheck_spec" -}}
exec:
  command: 
    {{- slice .test 1 | toYaml | nindent 4 }}
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