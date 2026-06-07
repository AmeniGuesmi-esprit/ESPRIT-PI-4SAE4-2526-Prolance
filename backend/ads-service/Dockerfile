# Runtime-only image. Jar is built by Jenkins (Maven) in the Build & Unit Tests stage,
# then docker build copies it in. This avoids running Maven inside Docker (faster + no
# Docker Hub round-trips during CI).
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java","-jar","/app/app.jar"]
