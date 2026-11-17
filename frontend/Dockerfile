# syntax=docker/dockerfile:1

# ---------- Etapa 1: compilar la aplicación React ----------
FROM node:24-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Etapa 2: servir con nginx ----------
FROM nginx:1.28-alpine
# Destinos del proxy (nombres de servicio dentro de la red de Docker Compose).
ENV NGINX_RESOLVER=127.0.0.11 \
    PACIENTE_SERVICE_URL=http://paciente-service:8081 \
    MEDICO_SERVICE_URL=http://medico-service:8082 \
    ESPECIALIDAD_SERVICE_URL=http://especialidad-service:8083 \
    TURNO_SERVICE_URL=http://turno-service:8084 \
    CONSULTA_SERVICE_URL=http://consulta-service:8085
# Solo se reemplazan estas variables (las de nginx, como $host, quedan intactas)
ENV NGINX_ENVSUBST_FILTER="^(NGINX_RESOLVER|[A-Z]+_SERVICE_URL)$"
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
