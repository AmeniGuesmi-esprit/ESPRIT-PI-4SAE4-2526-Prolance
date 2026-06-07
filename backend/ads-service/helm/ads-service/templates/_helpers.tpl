{{/*
Common labels for ads-service resources
*/}}
{{- define "ads-service.labels" -}}
app: ads-service
chart: {{ .Chart.Name }}-{{ .Chart.Version }}
release: {{ .Release.Name }}
heritage: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ads-service.selectorLabels" -}}
app: ads-service
{{- end }}

{{/*
Full image reference
*/}}
{{- define "ads-service.image" -}}
{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}
{{- end }}
