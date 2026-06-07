FROM grafana/grafana:latest

USER root
RUN mkdir -p /opt/grafana-plugins && \
    grafana cli --pluginsDir /opt/grafana-plugins plugins install grafana-clickhouse-datasource && \
    chown -R grafana:root /opt/grafana-plugins && \
    chmod -R 775 /opt/grafana-plugins
USER grafana

ENV GF_PATHS_PLUGINS=/opt/grafana-plugins
