# Staging del cotizador

Mismo comportamiento que desarrollo, desplegado junto a produccion pero aislado.
No se integra codigo a main ni se modifica Heroku para habilitar este entorno.

## Arquitectura

| Componente | Destino de staging |
| --- | --- |
| Core | Puerto del servidor 127.0.0.1:4610; base limpia en Neon |
| IA API | Puerto del servidor 127.0.0.1:4710 |
| IA PostgreSQL 17 | Contenedor postgres; base tuvansa_ai; volumen privado |
| Redis 7 | Contenedor redis; colas y eventos privados |
| ERP | Contenedor erp-api:3500, sin puerto publico y solo consultas |
| Workers | IA, WhatsApp y reportes independientes |
| Archivos | Volumen core_documents y ai_documents, nunca los de produccion |
| Frontend | Proyecto Firebase de staging con indicador permanente |

El proyecto Docker siempre se llama `tuvansa-staging`. No conectar la red
`infra-network` de produccion ni utilizar sus volumenes externos.
El ERP comparte solo los datos consultados de Proscai. Por defecto exige usuario
MySQL SELECT-only; tambien admite credenciales existentes con autorizacion explicita.
El catalogo Pinecone existente se utiliza solo para buscar; los productos locales
se escriben en `local-products-staging`. La sincronizacion del catalogo ERP se
bloquea: no requiere construir otro embedding de los productos existentes.

## 1. Preparar copias separadas en el servidor

Primero guardar y publicar las revisiones compatibles de los cuatro repositorios
sin subir archivos .env. Usar copias separadas de los checkouts de produccion:

```text
/srv/staging/
  tuvansa/
    cotizador-core-backend/
    tuvansa-ai-platform/
    cotizador-v2/           (opcional si se compila el frontend localmente)
  tuvansa-backend-ca/
```

La rama de despliegue es `staging` en los cuatro proyectos.
No actualizar `/srv/apps` ni cambiar la rama que esta atendiendo produccion.
Comprobar memoria, espacio y puertos antes de compilar:

```sh
free -h
df -h
docker stats --no-stream
ss -ltn | grep -E ':4610|:4710' || true
```

Crear una base vacia en Neon exclusiva para staging. No usar production,
development ni `backup-predeploy-20260924`. Aplicaremos las migraciones desde
cero: no se copian clientes, archivos fiscales ni operaciones reales.

## 2. Variables de entorno

Copiar las plantillas sin sobrescribir .env existentes:

```sh
cd /srv/staging/tuvansa/cotizador-core-backend
cp -n .env.staging.example .env.staging
cd ../tuvansa-ai-platform
cp -n .env.staging.example .env.staging
cp -n .env.staging.postgres.example .env.staging.postgres
cd ../../tuvansa-backend-ca
cp -n .env.staging.example .env.staging
```

Completar cada archivo y restringir sus permisos con `chmod 600`.
Generar secretos diferentes con `openssl rand -hex 32`. Nunca pegarlos en el chat.

- Core: `STAGING_DATABASE_URL` es la URL de Neon nueva. `STAGING_DATABASE_HOST`
  fija su hostname (se aceptan variantes pooler/no pooler del mismo endpoint).
  `PRODUCTION_DATABASE_HOST` debe conservar el hostname actual de produccion para
  rechazarlo incluso si se copia por error. JWT y firma PDF deben ser diferentes.
- IA: `DATABASE_URL=postgresql://postgres:CLAVE@postgres:5432/tuvansa_ai`.
  Usar en `.env.staging.postgres` el mismo `POSTGRES_PASSWORD` (24 caracteres o mas).
  Para facilitar la URL, generar la clave hexadecimal; si contiene caracteres
  especiales, codificarlos en la URL, no en POSTGRES_PASSWORD.
- Igualar `AI_PLATFORM_INTERNAL_API_KEY` del core con `INTERNAL_API_KEY` de IA.
  `GPT_LOCAL_PRODUCTS_API_KEY` debe coincidir con `LOCAL_PRODUCTS_INTERNAL_API_KEY`.
- Igualar `WHATSAPP_ASSISTANT_INTERNAL_API_KEY` del core con
  `CORE_BACKEND_ASSISTANT_API_KEY` de IA.
- Igualar `ERP_INTERNAL_API_KEY` del core, `ERP_PRODUCTS_API_KEY` de IA e
  `INTERNAL_API_KEY` del ERP. Esa clave nunca va en variables VITE.
- IA necesita OpenAI, Pinecone y Voyage para conservar todas las funciones.
  Copiar los nombres de modelo y parametros de embeddings que ya funcionan,
  no adoptar modelos o dimensiones nuevos durante este despliegue.
  El indice/namespace del catalogo ERP debe ser el existente. El namespace de
  productos locales sera `local-products-staging`, fijado tambien por Compose.
- ERP: usar un usuario MySQL dedicado con SELECT y, opcionalmente, SHOW VIEW.
  El proceso revisa `SHOW GRANTS FOR CURRENT_USER()` y se niega a arrancar si
  detecta escrituras, roles no verificables o GRANT OPTION. Si el operador confirma
  que la base ya esta protegida externamente, puede autorizar reutilizar las
  credenciales actuales con `STAGING_ERP_ALLOW_EXISTING_CREDENTIALS=true` en el
  .env.staging del ERP. Esa excepcion solo funciona en STAGING_MODE=true, no cambia
  permisos MySQL y no certifica la proteccion externa: se registra una advertencia
  y el estado de salud indica databasePrivilegesVerified=false. La API conserva
  la lista estricta de consultas; no habilita altas, cambios, correo ni FTP.
  No necesita acceso
  a la base PostgreSQL del backend antiguo, correo, FTP ni certificados TLS.
- Compose fuerza las URLs internas hacia core, ai-api y erp-api de staging.
  No usar localhost, Heroku ni nombres de contenedores de produccion ahi.
- `STAGING_SEED_PASSWORD` inicializa los usuarios, sin cambiar contrasenas existentes.
- Mantener WhatsApp y reportes automaticos apagados durante el primer arranque.

## 3. Despliegue guiado

Requiere Docker Compose v2 y Node.js 22 en el host. Para que el validador pueda leer
los .env se necesita dotenv, ya declarado en el proyecto. Si no estan instaladas
las dependencias del core, ejecutar `corepack pnpm install --frozen-lockfile`.
Respetar el gestor de cada proyecto: core/IA usan pnpm; frontend/ERP usan npm.

```sh
cd /srv/staging/tuvansa/cotizador-core-backend
node scripts/staging.mjs doctor
node scripts/staging.mjs deploy
node scripts/staging.mjs seed
node scripts/staging.mjs status
```

`doctor` no escribe ni imprime secretos. Verifica hosts, claves compartidas,
URLs y aislamiento de los volumenes. `deploy` compila, levanta PostgreSQL/Redis,
aplica `prisma migrate deploy` exclusivamente en staging y levanta los servicios.
No ejecuta migrate dev, reset, db push, restores ni borrados de datos.
Los comandos Docker necesitan permisos sobre el daemon; si tu servidor usa sudo,
ejecutar `sudo node scripts/staging.mjs ...` con Node disponible para root.

`seed` crea las sucursales 01,02,03,04,05,06,07 y usuarios SELLER, PURCHASING y
CREDIT_COLLECTIONS por sucursal, mas `admin-01`. Ejemplos: `seller-03`,
`purchasing-03`, `credit_collections-03`. Usan la clave inicial configurada y
correos reservados @staging.example, sin telefonos de terceros.
No crea clientes, cotizaciones, requisiciones ni embarques.
Los almacenes ERP no se deducen del numero de sucursal: asignarlos desde
Administracion para que las busquedas del vendedor tengan los permisos correctos.
Las opciones y marcas iniciales incluidas en migraciones se conservan; configurar
las opciones administrativas adicionales igual que en desarrollo si se necesitan.

Importar el mismo catalogo SAT que se utiliza en desarrollo, en PostgreSQL de IA
(no en Neon). Poner el XLSX en la ruta `STAGING_SAT_CATALOG_FILE` y ejecutar:

```sh
node scripts/staging.mjs sat-import
```

El comando utiliza el importador existente y deja metadatos de la version cargada;
no establece que el XLSX sea el catalogo SAT mas reciente.

## 4. Proxy HTTPS y frontend

Agregar estas rutas al servidor HTTPS existente sin cambiar las de produccion:

```nginx
location /cotizador-staging/ {
    proxy_pass http://127.0.0.1:4610/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 120s;
    client_max_body_size 25m;
}
location /ia-staging/ {
    proxy_pass http://127.0.0.1:4710/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    client_max_body_size 25m;
}
```

Conservar las barras finales. Ejecutar `nginx -t` antes de recargar Nginx.
`PUBLIC_API_URL` del core debe ser `https://HOST/cotizador-staging`.
No publicar el puerto ni una ruta publica directa de erp-api.
El frontend consulta ERP por el puente autenticado del core; se conservan los
contratos de respuesta, y las claves internas solo se agregan del lado servidor.

En el frontend, crear .env.staging desde su ejemplo y reemplazar STAGING_PUBLIC_HOST.
No modificar .env.production. Desplegar en un proyecto Firebase diferente:

```sh
npm ci
FIREBASE_STAGING_PROJECT_ID=cotizador-tuvansa-staging npm run deploy:staging
```

Crear/habilitar primero ese proyecto de Hosting. El script rechaza produccion.
Se muestra permanentemente `STAGING | DATOS DE PRUEBA` en la interfaz.

## 5. WhatsApp de desarrollo

El numero de desarrollo pasara a atender staging, no el equipo local. Nunca
cambiar el webhook del remitente de produccion. Registrar primero los telefonos
controlados en STAGING_TWILIO_ALLOWED_RECIPIENTS, separados por coma y en E.164.
Todos los adaptadores de salida aplican esa lista, incluso las alertas internas.

Configurar las variables STAGING_TWILIO_WHATSAPP_* con el remitente y las
plantillas de desarrollo. Conservar texto y variables; los encabezados multimedia
deben apuntar al endpoint staging, no a produccion ni al equipo local:

- Cotizacion: `https://HOST/cotizador-staging/api/public/quote-documents/{{4}}`.
- Reporte: `https://HOST/cotizador-staging/api/public/manager-reports/{{7}}`.
- Para validar las plantillas usar `sample.pdf` en esas mismas rutas y comprobar
  HTTP 200 application/pdf. Si la plantilla aprobada fija otra URL, crear su
  equivalente para staging y esperar aprobacion antes de habilitar los envios.
- Webhook entrante POST:
  `https://HOST/cotizador-staging/api/integrations/twilio/whatsapp/incoming`.

Habilitar TWILIO_WHATSAPP_ENABLED, WHATSAPP_INBOX_ENABLED y
WHATSAPP_ASSISTANT_ENABLED cuando las URLs, plantillas y lista esten listas;
recrear solo staging con `node scripts/staging.mjs up`. Revisar tambien los
switches en Administracion, porque los valores de base de datos tienen prioridad.
WHATSAPP_INTERNAL_VERIFICATION_ENABLED permanece deshabilitado en staging.
Para reportes programados activar STAGING_MANAGER_REPORT_SCHEDULER_ENABLED y
repetir up, despues crear una suscripcion con un telefono autorizado.
Comprobar el callback de entrega: que Twilio acepte el envio no prueba que el
PDF se entrego. No intentar saltar la ventana de 24 horas sin plantilla aprobada.

## 6. Verificacion y operacion

- Salud local: http://127.0.0.1:4610/api/health y http://127.0.0.1:4710/health/ready.
- Core/IA/ERP autenticados; usuarios y permisos de almacenes funcionan.
- Catalogo SAT, datos tecnicos, clasificacion y sugerencia EAN funcionan.
- Busqueda ERP y por embedding conservan su comportamiento.
- Extraccion PDF/Excel, dos proveedores con monedas distintas, costos vs precio
  de venta, requisiciones, aceptacion, pedido y embarque con datos controlados.
- No se modifican inventarios ERP: TXT/altas son archivos de staging. No importar
  los archivos de ejercicios al ERP real.
- Los cambios y archivos no aparecen en produccion; destinatarios fuera de la
  lista son rechazados y los embeddings ERP no se pueden sobrescribir.

```sh
node scripts/staging.mjs logs
node scripts/staging.mjs down     # Detiene solo staging y conserva los volumenes
node scripts/staging.mjs up
```

Antes de actualizar staging, respaldar su Neon y sus volumenes si se desean
conservar los ejercicios. Promover despues solo codigo y migraciones a
produccion, nunca las bases o archivos de staging. No ejecutar down -v ni
restaurar produccion desde el respaldo antiguo para limpiar ejercicios.
