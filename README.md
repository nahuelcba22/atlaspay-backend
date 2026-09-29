# AtlasPay · Backend

API REST de **AtlasPay**, una billetera digital multi-moneda pensada para viajeros, estudiantes de intercambio y freelancers de Latinoamérica. Permite gestionar usuarios, cuentas, transferencias y operaciones de cambio de moneda de forma simulada.

> Proyecto Final de la carrera Full Stack de Henry. Todas las operaciones son simuladas: no se utiliza dinero real.

## Tecnologías

* Node.js
* Express 5
* TypeScript
* PostgreSQL
* Sequelize
* JSON Web Token (JWT)
* bcrypt
* Vitest y Supertest
* ESLint y Prettier

## Requisitos previos

* [Node.js](https://nodejs.org/) (versión LTS reciente)
* npm
* Git
* PostgreSQL

## Instalación y uso local

1. Clonar el repositorio:

```bash
git clone https://github.com/nahuelcba22/atlaspay-backend.git
```

2. Entrar a la carpeta del proyecto:

```bash
cd atlaspay-backend
```

3. Instalar las dependencias:

```bash
npm install
```

4. Configurar las variables de entorno:

Crear un archivo `.env` en la raíz del proyecto con las credenciales correspondientes a la base de datos y la clave secreta utilizada para JWT.

> Las credenciales y claves privadas no deben subirse al repositorio.

5. Levantar el servidor en modo desarrollo:

```bash
npm run dev
```

## Scripts disponibles

| Comando              | Descripción                                                   |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | Levanta el servidor en modo desarrollo con recarga automática |
| `npm run build`      | Compila el proyecto TypeScript para producción                |
| `npm start`          | Ejecuta la versión compilada del backend                      |
| `npm test`           | Ejecuta las pruebas automatizadas                             |
| `npm run test:watch` | Ejecuta las pruebas en modo observador                        |

## Estructura del proyecto

```text
src/
├── config/        # Configuración de variables de entorno
├── controllers/   # Manejo de peticiones y respuestas HTTP
├── middlewares/   # Autenticación, validaciones y manejo de errores
├── models/        # Modelos y entidades de la base de datos
├── routes/        # Definición de endpoints de la API
├── schemas/       # Validación de datos de entrada
├── services/      # Lógica de negocio
├── utils/         # Funciones y utilidades auxiliares
├── app.ts         # Configuración de la aplicación Express
├── db.ts          # Configuración de la conexión con PostgreSQL
└── index.ts       # Punto de entrada del servidor

tests/
├── transferencias.test.ts
└── usuarios.test.ts
```

## Arquitectura

El backend utiliza una arquitectura por capas para separar las responsabilidades de la aplicación.

```text
Cliente
   │
   ▼
 Rutas
   │
   ▼
Middlewares
   │
   ▼
Controladores
   │
   ▼
 Servicios
   │
   ▼
  Modelos
   │
   ▼
PostgreSQL
```

* **Rutas:** Definen los endpoints disponibles de la API.
* **Middlewares:** Gestionan autenticación, validación de datos y errores.
* **Controladores:** Gestionan las solicitudes y respuestas HTTP.
* **Servicios:** Contienen la lógica de negocio.
* **Modelos:** Representan las entidades utilizadas por la aplicación y gestionan la interacción con la base de datos.
* **Schemas:** Definen las reglas de validación de los datos recibidos.

## Funcionalidades

### Usuarios

* Registro de usuarios.
* Inicio de sesión.
* Hashing seguro de contraseñas.
* Autenticación mediante JWT.
* Validación de datos.

### Cuentas

* Gestión de cuentas asociadas a los usuarios.
* Consulta y manejo de saldos.

### Transferencias

* Transferencias entre cuentas.
* Validación de saldo disponible.
* Registro de operaciones.
* Validación de los datos de la transferencia.

### Exchange

* Conversión entre las monedas soportadas.
* Cálculo y manejo de valores monetarios.

## Testing

El proyecto utiliza **Vitest** para las pruebas automatizadas y **Supertest** para realizar pruebas sobre los endpoints HTTP.

Las pruebas actuales cubren funcionalidades relacionadas con usuarios y transferencias.

Para ejecutar las pruebas:

```bash
npm test
```

Durante el desarrollo también se puede utilizar el modo observador:

```bash
npm run test:watch
```

## Flujo de trabajo

* No trabajar directamente sobre `main`.
* Crear una rama por tarea utilizando prefijos como `feat/...`, `fix/...` o `docs/...`.
* Utilizar mensajes de commit con prefijos como `feat:`, `fix:`, `chore:` y `docs:`.
* Integrar los cambios mediante Pull Request.
* Mantener las credenciales y variables sensibles fuera del repositorio.

## Repositorio relacionado

* Frontend: [atlaspay-frontend](https://github.com/nahuelcba22/atlaspay-frontend)

## Equipo

* Mariano Nahuel Córdoba · Backend
* Nayla Pereira · Frontend
* Ludmila Acosta · Frontend
* Dayana Gonzales · Frontend

## Licencia

Este proyecto se distribuye bajo la licencia **ISC**.