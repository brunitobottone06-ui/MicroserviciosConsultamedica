# Consultorio médico — sistema de turnos con microservicios

Sistema **local** para gestionar un consultorio médico: pacientes, médicos, especialidades, turnos y
consultas, con un frontend web y un asistente de IA opcional que funciona en la propia computadora.

> Trabajo final de Backend. Se ejecuta solo en tu computadora con Docker Compose; no usa servicios en la nube.

---

## Índice

1. [Para qué sirve y qué módulos tiene](#1-para-qué-sirve-y-qué-módulos-tiene)
2. [Requisitos previos](#2-requisitos-previos)
3. [Preparar el archivo `.env`](#3-preparar-el-archivo-env)
4. [Iniciar y detener el sistema con Docker Compose](#4-iniciar-y-detener-el-sistema-con-docker-compose)
5. [Frontend](#5-frontend)
6. [Asistente de IA (Ollama)](#6-asistente-de-ia-ollama)
7. [Uso de las funciones principales](#7-uso-de-las-funciones-principales)
8. [Conectar pgAdmin a las bases de datos](#8-conectar-pgadmin-a-las-bases-de-datos)
9. [Solución de problemas](#9-solución-de-problemas)
10. [Funciones pendientes y limitaciones](#10-funciones-pendientes-y-limitaciones)
11. [Anexo: pruebas automáticas y estructura](#11-anexo-pruebas-automáticas-y-estructura)

---

## 1. Para qué sirve y qué módulos tiene

El sistema permite que el **personal del consultorio** gestione la agenda y la atención, y que los
**pacientes** pidan y cancelen sus propios turnos desde el navegador.

| Módulo | Qué hace | Puerto local |
|---|---|---|
| **paciente-service** | Pacientes, cuentas de usuario e inicio de sesión (emite los tokens JWT) | 8081 |
| **medico-service** | Médicos y las especialidades que atiende cada uno | 8082 |
| **especialidad-service** | Especialidades médicas | 8083 |
| **turno-service** | Turnos: reserva, reprogramación, cancelación, horario de atención | 8084 |
| **consulta-service** | Consultas (registro clínico) y **asistente de IA** | 8085 |
| **frontend** | Aplicación web (React + TypeScript) servida por nginx | 3000 |
| **ollama** *(opcional)* | Modelo de lenguaje local para el asistente | 11434 |

- Cada microservicio tiene **su propia base PostgreSQL** (5 bases en total). Ningún servicio accede a la base
  de otro: se comunican por API REST y se referencian por ID.
- Roles de usuario:
  - **Administrativo**: gestiona pacientes, médicos, especialidades, turnos y usuarios.
  - **Médico**: consulta la información y es el único que ve y registra consultas (datos clínicos).
  - **Paciente**: ve sus datos y pide, consulta y cancela **sus** turnos.
- "Eliminar" pacientes, médicos o especialidades es una **baja lógica**: el registro queda inactivo y se conserva el historial.

Tecnologías: Java 25, Spring Boot 4.1.2, Spring AI 2.0.2 (Ollama), PostgreSQL 17, React 19, TypeScript, Vite, Docker Compose.

---

## 2. Requisitos previos

### Para usar el sistema (lo único obligatorio)

| Herramienta | Versión | Para qué |
|---|---|---|
| **Docker Desktop** | Con Docker Compose v2 (comando `docker compose`). En Windows requiere **WSL 2**. | Construye y ejecuta todo |
| Navegador web | Cualquiera actual | Usar el sistema |

Con Docker alcanza: Java, Maven y Node.js se usan **dentro** de los contenedores durante la construcción
(imágenes `maven:3.9-eclipse-temurin-25`, `eclipse-temurin:25-jre`, `node:24-alpine` y `nginx:1.28-alpine`).

> **Windows y WSL 2:** si Docker Desktop no arranca y `wsl --status` indica que WSL no está instalado,
> abrí PowerShell **como administrador**, ejecutá `wsl --install --no-distribution` y reiniciá la PC.

**Recursos recomendados:** el sistema sin IA usa aproximadamente 1,8 GB de RAM. El asistente agrega unos
3 GB más mientras el modelo está cargado y unos 2 GB de disco para el modelo.

### Solo si querés desarrollar o ejecutar las pruebas fuera de Docker

| Herramienta | Versión | Notas |
|---|---|---|
| **JDK** | **25** | Definido en los `pom.xml` (`<java.version>25</java.version>`) |
| **Maven** | **No hace falta instalarlo** | El proyecto incluye Maven Wrapper (`mvnw` / `mvnw.cmd`), que descarga Maven **3.9.16** automáticamente |
| **Node.js** | **24** (con npm) | Misma versión mayor que la imagen `node:24-alpine` del frontend |
| **pgAdmin 4** | Opcional | Solo para mirar las bases de datos (ver [sección 8](#8-conectar-pgadmin-a-las-bases-de-datos)) |

---

## 3. Preparar el archivo `.env`

El archivo `.env` contiene contraseñas y claves **solo para tu computadora**. Está en `.gitignore` y
**no debe subirse a ningún repositorio ni copiarse en documentos**.

1. En la carpeta raíz del proyecto, copiá la plantilla:

   ```powershell
   # PowerShell
   Copy-Item .env.example .env
   ```
   ```bash
   # Git Bash / Linux / macOS
   cp .env.example .env
   ```

2. Abrí `.env` y reemplazá los valores de ejemplo por valores propios:

   | Variable | Qué es |
   |---|---|
   | `DB_USERNAME` | Usuario de las 5 bases PostgreSQL |
   | `DB_PASSWORD` | Contraseña de las bases. Elegí una propia |
   | `JWT_SECRETO` | Clave que firma los tokens de inicio de sesión. **Mínimo 32 caracteres aleatorios** |
   | `ADMIN_USUARIO` | Usuario del primer administrativo (por defecto `admin`) |
   | `ADMIN_CLAVE` | Contraseña de ese administrativo. **Mínimo 8 caracteres** |
   | `OLLAMA_MODEL` | Modelo del asistente (por defecto `llama3.2:3b`) |
   | `OLLAMA_BASE_URL` | Dónde está Ollama: `http://ollama:11434` (Ollama dentro de Docker) o `http://host.docker.internal:11434` (Ollama instalado en Windows) |

   Para generar un `JWT_SECRETO` aleatorio (requiere Node.js):

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Tené en cuenta lo siguiente:
   - **El administrador inicial se crea una sola vez**, la primera vez que inicia paciente-service y solo si
     todavía no existe ningún usuario administrativo. Si después cambiás `ADMIN_CLAVE`, la contraseña **no** se actualiza.
   - **Las credenciales de la base se fijan al crearla.** PostgreSQL toma `DB_USERNAME` y `DB_PASSWORD` solo
     la primera vez que crea cada base (cuando el volumen está vacío). Si las cambiás después, los servicios
     no van a poder conectarse (ver [solución de problemas](#9-solución-de-problemas)).
   - **Si falta alguna variable obligatoria**, Docker Compose se detiene con un mensaje como
     `Falta DB_PASSWORD. Copia .env.example como .env`.

---

## 4. Iniciar y detener el sistema con Docker Compose

Todos los comandos se ejecutan en la **carpeta raíz del proyecto**, donde está `docker-compose.yml`, y con
**Docker Desktop abierto** (abajo a la izquierda tiene que decir *Engine running*).

### Iniciar (sin asistente de IA)

```powershell
docker compose up -d --build
```

- Levanta las 5 bases PostgreSQL, los 5 microservicios y el frontend.
- La **primera vez** tarda varios minutos, porque descarga imágenes y dependencias. Las siguientes son mucho más rápidas.
- `--build` hace falta la primera vez y cada vez que cambia el código. Si no hubo cambios, alcanza con `docker compose up -d`.

### Verificar que todo esté funcionando

```powershell
docker compose ps
```

Todos los servicios tienen que aparecer como **`(healthy)`**. Los microservicios pueden tardar alrededor de
un minuto en pasar de `starting` a `healthy`. También podés verlo en el **Panel** del frontend, en "Estado del sistema".

### Ver los logs

```powershell
docker compose logs -f turno-service      # un servicio (Ctrl+C para salir)
docker compose logs --tail 100            # últimas líneas de todos
```

### Detener SIN perder datos

```powershell
docker compose stop                       # detiene los contenedores (se reinician con "docker compose start")
docker compose --profile ia down          # detiene y elimina los contenedores, pero CONSERVA los volúmenes (los datos)
```

Ambos comandos **conservan los datos**: quedan guardados en volúmenes de Docker
(`consultorio-medico_paciente-db-datos`, `..._medico-db-datos`, `..._especialidad-db-datos`,
`..._turno-db-datos`, `..._consulta-db-datos` y `..._ollama-modelos`).

> ⚠️ **No uses `docker compose down -v`** ni borres los volúmenes desde Docker Desktop: la opción `-v`
> **elimina las bases de datos y el modelo descargado de forma permanente**.

Los contenedores tienen `restart: unless-stopped`: si apagás la PC con el sistema corriendo, vuelven a
iniciarse solos al abrir Docker Desktop.

### Datos de ejemplo

Al crear las bases por primera vez se cargan datos de ejemplo **ficticios**: 5 especialidades, 4 médicos y
3 pacientes. No corresponden a personas reales.

---

## 5. Frontend

### Opción A — con Docker (recomendada)

El frontend ya se inicia con `docker compose up -d --build`. Abrí:

**http://localhost:3000**

nginx sirve la aplicación y reenvía las llamadas `/api/...` a cada microservicio.

### Opción B — modo desarrollo (Vite)

Sirve para modificar el frontend y ver los cambios al instante. Requiere Node.js 24 y que los
microservicios estén corriendo en Docker, porque el proxy de Vite los busca en `localhost:8081` a `8085`.

```powershell
cd frontend
npm install        # solo la primera vez (o si cambia package.json)
npm run dev
```

Abrí **http://localhost:5173**.

Scripts disponibles en `frontend/package.json` (se ejecutan dentro de `frontend`):

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite (puerto 5173) |
| `npm run build` | Verificación de tipos (`tsc -b`) y compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación de `dist/` (puerto 4173) |
| `npm test` | Ejecuta las pruebas una vez (Vitest) |
| `npm run test:watch` | Pruebas en modo observación |
| `npm run typecheck` | Solo verificación de tipos |

---

## 6. Asistente de IA (Ollama)

El asistente responde preguntas **administrativas**: horarios, cómo pedir o cancelar turnos y cómo usar el
sistema. **Es opcional:** si no está activo, el resto del sistema funciona igual.

Reglas que aplica el sistema, más allá de lo que haga el modelo:

- **Preguntas de salud:** si la pregunta trata de síntomas, diagnósticos, medicamentos o urgencias, responde
  con un mensaje de seguridad fijo **sin consultar al modelo**. Ante urgencias indica llamar al 107 o al 911.
- **Datos personales:** los oculta (DNI, email, teléfono, "me llamo…") antes de enviar el texto al modelo.
- **Datos clínicos:** el asistente no tiene acceso a las consultas ni a los datos de pacientes.

### Activar el asistente con Ollama en Docker

```powershell
docker compose --profile ia up -d
```

Esto inicia dos contenedores:

- **`ollama`**: el servidor del modelo (puerto 11434).
- **`ollama-modelo`**: descarga `llama3.2:3b` (unos 2 GB) **una sola vez** y termina. Que figure como
  `Exited (0)` es lo esperado. El modelo queda guardado en el volumen `ollama-modelos`.

### Verificar que el modelo esté descargado

```powershell
docker compose logs ollama-modelo          # debe terminar con "success"
docker compose exec ollama ollama list     # debe mostrar llama3.2:3b
```

En el frontend, la sección **Asistente** muestra **"Conectado"** cuando todo está listo.

### Usarlo

Entrá a **Asistente** desde el menú (con cualquier rol), elegí una pregunta sugerida o escribí la tuya y
presioná Enter.

En una PC sin placa de video compatible, el modelo funciona solo con el procesador:

- **Primera respuesta:** puede tardar entre 30 y 60 segundos, porque carga el modelo en memoria.
- **Siguientes respuestas:** suelen tardar entre 5 y 25 segundos.
- **Después de 30 minutos sin uso**, el modelo se descarga de memoria y la próxima respuesta vuelve a tardar más.

### Si el asistente aparece como "No disponible"

La pantalla del asistente explica el motivo exacto:

| Mensaje | Qué hacer |
|---|---|
| *No se pudo conectar con Ollama en …* | Ejecutá `docker compose --profile ia up -d`. Si usás Ollama instalado en Windows, poné `OLLAMA_BASE_URL=http://host.docker.internal:11434` en `.env` y ejecutá `docker compose up -d consulta-service` |
| *El modelo '…' no está descargado* | `docker compose --profile ia up -d ollama-modelo`, o `docker compose exec ollama ollama pull llama3.2:3b` |
| *El modelo tardó demasiado en responder* | El modelo se estaba cargando: esperá unos segundos y reintentá |
| *El asistente está deshabilitado por configuración* | La variable `ASISTENTE_HABILITADO` está en `false` |

Para apagar solo la IA, sin tocar el resto del sistema: `docker compose stop ollama`.

---

## 7. Uso de las funciones principales

### Iniciar sesión

Abrí http://localhost:3000. Si no hay sesión iniciada, se abre **Iniciar sesión**: ingresá tu usuario y
contraseña y presioná **Ingresar**.

- **Administración:** el usuario y la contraseña son los de `ADMIN_USUARIO` y `ADMIN_CLAVE` de tu `.env`.
- **Pacientes:** el usuario es el **DNI** (sin puntos).
- **Médicos u otro personal:** la cuenta la crea un administrativo en **Usuarios**.
- **Para salir:** **Cerrar sesión**, en el menú lateral.
- **Vencimiento:** la sesión dura 8 horas. Al vencer, el sistema pide iniciar sesión de nuevo.

### Registrarse (paciente nuevo)

1. En **Iniciar sesión**, presioná **Crear cuenta**.
2. Completá tus datos (nombre, apellido, DNI, fecha de nacimiento y, si querés, contacto y obra social) y
   elegí una contraseña de al menos 8 caracteres.
3. Presioná **Crear cuenta**: se inicia la sesión automáticamente.

Si ya fuiste atendido y tu DNI está cargado, no podés registrarte de nuevo. Recepción habilita tu acceso
desde tu ficha (**Pacientes → Ver → Habilitar acceso web**).

### Pedir un turno

1. **Paciente:** menú **Pedir turno**. **Personal:** **Turnos → Nuevo turno**, y además elegir el paciente.
2. Elegí la **especialidad**, después el **profesional** (solo aparecen los que la atienden), el **día** y un
   **horario** disponible. Podés cambiar la duración y escribir un motivo opcional.
3. Presioná **Siguiente**, revisá el comprobante y presioná **Confirmar turno**.

Los turnos deben estar dentro del horario de atención (lunes a viernes de 08:00 a 20:00) y no pueden
superponerse con otro turno del mismo médico ni del mismo paciente.

### Consultar y cancelar un turno

1. **Paciente:** **Mis turnos**. **Personal:** **Turnos**, que tiene filtros por período, estado, médico y paciente.
2. Presioná **Ver** en el turno.
3. Presioná **Cancelar turno** y después **Sí, confirmar**.

El turno **no se borra**: queda como *Cancelado* y el horario se libera. Solo el personal administrativo
puede eliminar definitivamente un turno ya cancelado. Un turno atendido no se puede cancelar.

### Registrar una consulta (médicos)

Hay dos caminos:

- **Desde el turno:** **Turnos → Ver → Registrar consulta**.
- **Desde Consultas:** **Consultas → Registrar consulta**.

Completá el motivo y, si corresponde, diagnóstico, tratamiento y observaciones. Al guardar, el turno queda *Atendido*.

### Consultar al asistente

Entrá a **Asistente**, elegí una pregunta sugerida o escribí la tuya. No escribas datos personales. Ver
la [sección 6](#6-asistente-de-ia-ollama).

---

## 8. Conectar pgAdmin a las bases de datos

Cada microservicio tiene su propia base. Los puertos solo aceptan conexiones **desde tu propia
computadora** (`127.0.0.1`). El sistema tiene que estar iniciado con Docker Compose.

En pgAdmin: **Register → Server…** y, en la pestaña **Connection**:

| Servidor (nombre libre) | Host | Puerto | Base de datos (*Maintenance database*) | Usuario |
|---|---|---|---|---|
| Consultorio – Pacientes | `localhost` | `5433` | `pacientes` | valor de `DB_USERNAME` |
| Consultorio – Médicos | `localhost` | `5434` | `medicos` | valor de `DB_USERNAME` |
| Consultorio – Especialidades | `localhost` | `5435` | `especialidades` | valor de `DB_USERNAME` |
| Consultorio – Turnos | `localhost` | `5436` | `turnos` | valor de `DB_USERNAME` |
| Consultorio – Consultas | `localhost` | `5437` | `consultas` | valor de `DB_USERNAME` |

- **Contraseña:** la de `DB_PASSWORD` de tu `.env`.
- **Usuario:** en `.env.example`, `DB_USERNAME` viene como `consultorio`.
- **Tablas:** están en *Schemas → public → Tables*. La tabla `flyway_schema_history` registra las migraciones aplicadas.

**Alternativa sin pgAdmin:** abrir una consola SQL dentro del contenedor.

```powershell
docker compose exec paciente-db psql -U consultorio -d pacientes
```

(Reemplazá `consultorio` si usás otro `DB_USERNAME`). Dentro, `\dt` lista las tablas y `\q` sale.

> **Cuidado:** las tablas contienen datos personales y clínicos. Los cambios hechos a mano en la base no
> pasan por las validaciones de los servicios.

---

## 9. Solución de problemas

### Docker

| Síntoma | Causa probable y solución |
|---|---|
| `failed to connect to the docker API … dockerDesktopLinuxEngine` | Docker Desktop no está abierto. Abrilo y esperá *Engine running* |
| Docker Desktop no arranca o pide WSL | Instalá WSL 2: PowerShell como administrador → `wsl --install --no-distribution` → reiniciar |
| `docker: command not found` en una terminal ya abierta | La terminal se abrió antes de instalar Docker: cerrala y abrila de nuevo (o reiniciá VS Code) |
| `Falta DB_PASSWORD…` (u otra variable) | No existe `.env` o le falta esa variable. Ver [sección 3](#3-preparar-el-archivo-env) |
| Un servicio queda en `unhealthy` o se reinicia | Mirá sus logs: `docker compose logs --tail 100 <servicio>` |
| Error al construir (`--build`) por red | Reintentá: la primera construcción descarga muchas dependencias de internet |

### PostgreSQL

| Síntoma | Causa probable y solución |
|---|---|
| `password authentication failed for user …` en los logs de un servicio | Cambiaste `DB_USERNAME` o `DB_PASSWORD` en `.env` después de crear las bases. Volvé a los valores originales. Si necesitás otra contraseña, cambiala dentro de PostgreSQL (`ALTER USER … PASSWORD …`); no borres los volúmenes |
| `JWT_SECRETO … demasiado corta` | Usá una clave de 32 caracteres o más |
| No se puede iniciar sesión con `admin` | El administrador se creó con el `ADMIN_CLAVE` que había la **primera** vez. Cambiar `.env` después no lo actualiza |
| pgAdmin no conecta | Verificá que el sistema esté corriendo (`docker compose ps`), el puerto correcto (5433 a 5437) y el host `localhost` |

### Puertos ocupados

Si aparece `port is already allocated` o `bind: address already in use`, otro programa usa uno de los
puertos 3000, 5433–5437, 8081–8085 o 11434. Para identificarlo:

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3000,5433,5434,5435,5436,5437,8081,8082,8083,8084,8085,11434 |
  Select-Object LocalPort, OwningProcess, @{n='Proceso';e={(Get-Process -Id $_.OwningProcess).ProcessName}}
```

Cerrá ese programa o cambiá el puerto **de tu PC** en `docker-compose.yml` (el número de la izquierda en
`"127.0.0.1:3000:80"`). Si tenés **Ollama instalado en Windows**, ocupa el puerto 11434: usá esa instalación
(ver [sección 6](#6-asistente-de-ia-ollama)) o cerrala antes de iniciar el perfil `ia`. Si `npm run dev`
informa que el puerto 5173 está ocupado, probablemente ya haya otro servidor de Vite abierto.

### npm en PowerShell

| Síntoma | Solución |
|---|---|
| `npm : No se puede cargar el archivo …\npm.ps1 porque la ejecución de scripts está deshabilitada` | Usá `npm.cmd run dev` en lugar de `npm run dev`, o habilitá scripts para tu usuario: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `npm : El término 'npm' no se reconoce…` | Instalá Node.js 24 y abrí una terminal nueva |
| `Missing script: "dev"` | Estás en la carpeta raíz: ejecutá `cd frontend` primero |
| La página de desarrollo muestra "Servicio no disponible" | Los microservicios no están corriendo: `docker compose up -d` en la carpeta raíz |

### Ollama y el asistente

| Síntoma | Solución |
|---|---|
| "No disponible – No se pudo conectar con Ollama" | `docker compose --profile ia up -d` |
| "El modelo … no está descargado" | `docker compose exec ollama ollama pull llama3.2:3b` |
| Respuestas muy lentas o "tardó demasiado" | Es normal en CPU, sobre todo la primera respuesta. Cerrá programas pesados o asigná más memoria a Docker Desktop (*Settings → Resources*) |
| El asistente responde algo incorrecto sobre el sistema | Es un modelo pequeño y puede equivocarse. Guiate por las pantallas y este manual |

---

## 10. Funciones pendientes y limitaciones

**No implementado:**

- **Contraseñas:** no hay recuperación ni cambio de contraseña desde el sistema; lo resuelve el personal.
- **Seguridad del inicio de sesión:** no hay bloqueo tras varios intentos fallidos.
- **Datos propios del paciente:** no puede editarlos ("Mis datos" es de solo lectura).
- **Cuentas de médico:** no están vinculadas a su ficha de médico, así que un médico ve la agenda y las
  consultas de todo el consultorio, no solo las propias.
- **Disponibilidad para pacientes:** al reservar, un paciente no ve los horarios que ocuparon otros pacientes
  (el backend solo le devuelve sus propios turnos). La superposición se rechaza al confirmar, con un mensaje claro.
- **Actividad reciente del panel:** se calcula a partir de las fechas de reserva de turnos y de registro de
  consultas. No hay un historial de cambios: por ejemplo, no se guarda cuándo se canceló un turno.
- **Escala:** el panel y algunos listados cargan todos los registros (no hay paginación), lo que alcanza para
  un consultorio pequeño.

**Limitaciones técnicas conocidas:**

- **Turnos simultáneos:** si dos personas confirman el mismo horario exactamente al mismo tiempo, podrían
  quedar dos turnos superpuestos (no hay bloqueo a nivel de base de datos).
- **Consulta y turno:** registrar la consulta y marcar el turno como atendido son operaciones en dos servicios
  distintos (no es una transacción distribuida). Si falla Turnos, la consulta se deshace.
- **Filtro de datos personales del asistente:** es heurístico. Un nombre escrito suelto, sin "me llamo…",
  puede no detectarse. El detector de preguntas clínicas puede tener falsos positivos.
- **Horario de atención:** se configura en dos lugares (turno-service y el texto del asistente en
  `docker-compose.yml`) y deben coincidir.
- **El asistente** usa un modelo de 3B parámetros en CPU: es lento y puede dar respuestas imprecisas.

**Qué se comprobó y qué no:**

- **Comprobado en esta PC (Windows 11, Docker Desktop 4.99):**
  - Construcción e inicio con Docker Compose y conexión de los servicios con PostgreSQL 17.
  - Inicio de sesión y permisos por rol.
  - Reserva, cancelación y registro de consultas.
  - Asistente con `llama3.2:3b` en Ollama.
  - Frontend en escritorio, tablet y móvil.
- **No comprobado:** la conexión con **pgAdmin**. Los datos de la tabla de la sección 8 salen de
  `docker-compose.yml`, pero no se probó con pgAdmin. Tampoco se probó en macOS o Linux, ni con una placa de video para Ollama.

---

## 11. Anexo: pruebas automáticas y estructura

### Ejecutar las pruebas

Backend (requiere JDK 25; Maven se descarga solo):

```powershell
# Si "java -version" no muestra 25, indicá dónde está el JDK 25:
$env:JAVA_HOME = "C:\ruta\al\jdk-25"
.\mvnw.cmd verify
```

Frontend:

```powershell
cd frontend
npm install
npm test
```

Las pruebas de backend usan una base H2 en memoria y no necesitan Docker.

### Estructura de carpetas

```
docker-compose.yml        Orquestación local (bases, servicios, frontend, Ollama opcional)
.env.example              Plantilla de configuración (copiar a .env)
pom.xml, mvnw, mvnw.cmd   Compila y prueba los 5 servicios con un solo comando
services/
  paciente-service/       Pacientes, usuarios e inicio de sesión
  medico-service/
  especialidad-service/
  turno-service/
  consulta-service/       Consultas + asistente de IA (Spring AI)
frontend/                 React + TypeScript + Vite; nginx/ con el proxy de producción
```
