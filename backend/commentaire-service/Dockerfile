FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["sh", "-c", "java -DGRAYLOG_HOST=${GRAYLOG_HOST:-localhost} -DJAEGER_HOST=${JAEGER_HOST:-localhost} -jar app.jar"]
