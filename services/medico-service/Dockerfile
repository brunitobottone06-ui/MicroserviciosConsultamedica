# syntax=docker/dockerfile:1

# ---------- Etapa 1: compilar con Maven y JDK 25 ----------
FROM maven:3.9-eclipse-temurin-25 AS compilacion
WORKDIR /app
# Primero solo el pom: si no cambian las dependencias, Docker reutiliza esta capa (build más rápido)
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
# Las pruebas se ejecutan fuera de Docker con ./mvnw verify; aquí solo se empaqueta.
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

# ---------- Etapa 2: imagen final, solo con el JRE ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
# curl se usa en el health check de Docker Compose (la imagen base no lo incluye)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=compilacion /app/target/*.jar app.jar
USER app
EXPOSE 8082
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
