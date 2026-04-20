# Guia rapida para actualizar la web

## Panel privado real

Levanta el proyecto con:

`npm start`

Luego abre:

- `http://localhost:3000/`
- `http://localhost:3000/admin.html`

Credenciales por defecto:

- Usuario: `homelit`
- Contrasena: `Homelit2026!`

## Como funciona esta version

- La pagina publica se sirve desde `server.js`
- El panel privado usa login real con cookie de sesion
- Las propiedades se guardan en `data/properties.json`
- Las imagenes nuevas se guardan en `data/uploads/`

## Importante

Para publicar de verdad, este proyecto ya puede montarse en un servidor Node sencillo. Mas adelante se puede migrar a base de datos si quieres.

## Publicarlo en internet

La forma mas simple para esta version es `Render`, porque permite:

- publicar una app Node
- usar dominio propio
- tener HTTPS automatico
- guardar propiedades e imagenes en un disco persistente

### Antes de publicar

1. Sube esta carpeta a un repositorio de GitHub.
2. Asegurate de incluir:
   - `server.js`
   - `package.json`
   - `render.yaml`
   - `data/properties.json`
   - `data/uploads/`

### En Render

1. Crea una cuenta en [Render](https://render.com/).
2. Elige `New +` -> `Blueprint`.
3. Conecta tu repositorio.
4. Render detectara `render.yaml`.
5. Cuando te pida variables privadas, define:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
6. Despliega el servicio.

### Como queda guardado el contenido

- En el primer despliegue, el servidor copia las propiedades y fotos actuales al disco persistente.
- Desde ese momento, los cambios del panel privado quedan guardados online.
- No dependeras ya del navegador local.

### Dominio propio

Cuando el sitio ya este funcionando en Render:

1. Entra al servicio.
2. Ve a `Settings` -> `Custom Domains`.
3. Agrega tu dominio.
4. Actualiza los DNS en tu proveedor de dominio.
5. Verifica el dominio en Render.

Render mantiene tambien HTTPS automaticamente.

## Migrar desde el sistema anterior

1. Abre `legacy-export.html` desde el entorno antiguo y descarga un respaldo JSON.
2. Entra al nuevo panel `admin.html`.
3. Usa `Importar respaldo`.

## Cambiar el logo

1. Guarda tu logo dentro de `/Users/feliperivadeneiravelaquez/Documents/pagina HOMELIT/assets/`.
2. Si quieres hacerlo de la forma mas simple, reemplaza el archivo:

`/Users/feliperivadeneiravelaquez/Documents/pagina HOMELIT/assets/logo-placeholder.svg`

por tu logo, usando el mismo nombre.

3. Si tu logo tiene otro nombre, cambia esta linea en:

`/Users/feliperivadeneiravelaquez/Documents/pagina HOMELIT/index.html`

```html
<img class="brand-logo" src="./assets/logo-placeholder.svg" alt="Logo HOMELIT" />
```

## Agregar nuevas propiedades

1. Entra a `http://localhost:3000/admin.html`
2. Inicia sesion
3. Completa el formulario
4. Sube una o varias fotos
5. Guarda la propiedad

## Filtros disponibles

La web ya filtra por:

- Pais
- Ubicacion escrita manualmente
- Operacion
- Moneda
- Precio minimo
- Precio maximo
- Tipo de propiedad
