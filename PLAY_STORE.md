# Publicar AndroTec en Google Play (PWABuilder / TWA)

La app de Play es una **TWA** (Trusted Web Activity): una cáscara Android que
abre `https://jimmyrojasmyto-blip.github.io/AndroTec-RBJ-HRD/` a pantalla
completa. El contenido se actualiza solo con cada `push`; solo se vuelve a
subir a Play si cambia el icono, el nombre o la versión del envoltorio.

En este repo ya quedan preparados:

| Archivo | Para qué |
|---|---|
| `twa-manifest.json` | Configuración lista para PWABuilder / Bubblewrap (IDs, colores, iconos, atajo) |
| `.well-known/assetlinks.json` | Plantilla de Digital Asset Links (falta pegar el SHA-256 real) |
| `privacidad.html` | Política de privacidad — Play exige una URL pública |

---

## 0. Requisitos

- La PWA ya está en línea y pasa las comprobaciones de PWABuilder. ✅
- Cuenta de **Google Play Console**: pago único de 25 USD.
- (Opcional, para probar el APK antes de subir) un teléfono Android con
  "Depuración USB" o un emulador.

---

## 1. Generar el paquete en PWABuilder

1. Entrá a <https://www.pwabuilder.com> y pegá la URL:
   `https://jimmyrojasmyto-blip.github.io/AndroTec-RBJ-HRD/`
2. Revisá el puntaje (Manifest / Service Worker / Security deben estar en verde).
3. Botón **Package for stores → Android**.
4. En **Android package options** poné exactamente estos valores
   (coinciden con `twa-manifest.json`):

   | Campo | Valor |
   |---|---|
   | Package ID | `io.github.jimmyrojasmyto_blip.androtec` |
   | App name | `AndroTec — Museo 3D de morfología espermática` |
   | Short name / Launcher name | `AndroTec 3D` |
   | App version | `1.0.0` |
   | App version code | `1` |
   | Start URL | `/AndroTec-RBJ-HRD/index.html` |
   | Theme color | `#103b52` |
   | Background color | `#0b2b3d` |
   | Nav color | `#0b2b3d` |
   | Display mode | `standalone` |
   | Fallback behavior | `Custom Tabs` |
   | Signing key | **Create new** (que PWABuilder genere el keystore) |

   > ⚠️ El **Package ID es permanente** una vez publicado. Si preferís otro,
   > cambialo ahora y también en `twa-manifest.json` y en `.well-known/assetlinks.json`.

5. **Generate** y descargá el `.zip`.

### Contenido del .zip

| Archivo | Uso |
|---|---|
| `app-release-signed.aab` | **Esto se sube a Play Console** |
| `app-release-signed.apk` | Para probar en un teléfono: `adb install app-release-signed.apk` |
| `assetlinks.json` | El de verdad, con el SHA-256 real → ver paso 2 |
| `signing.keystore` + `signing-key-info.txt` | 🔴 **GUARDAR EN LUGAR SEGURO Y CON RESPALDO.** Sin este keystore no vas a poder publicar actualizaciones nunca más. |

---

## 2. Publicar el `assetlinks.json` en la RAÍZ del dominio

Sin esto, la app abre con la barra de direcciones de Chrome visible (se ve feo
y Play lo penaliza).

En GitHub Pages de proyecto, Android busca el archivo en la **raíz del
dominio**, no en el subdirectorio:

```
https://jimmyrojasmyto-blip.github.io/.well-known/assetlinks.json
```

Como ese dominio raíz todavía no existe, hay que crearlo:

1. Creá un repo público llamado **`jimmyrojasmyto-blip.github.io`**.
2. Dentro, agregá el archivo `.well-known/assetlinks.json` con el contenido
   del `assetlinks.json` que vino en el `.zip` de PWABuilder.
3. Settings → Pages → Deploy from branch `main` / root.
4. Esperá unos minutos y verificá que responda:
   ```bash
   curl https://jimmyrojasmyto-blip.github.io/.well-known/assetlinks.json
   ```
   Debe mostrar el JSON con el `package_name` y el `sha256_cert_fingerprints`.
5. Actualizá también la plantilla de este repo
   (`.well-known/assetlinks.json`) pegando el mismo SHA-256, para dejarlo
   documentado.

> Alternativa: usar un dominio propio (Settings → Pages → Custom domain) y
> servir `/.well-known/assetlinks.json` desde ahí.

---

## 3. Verificar el vínculo

Herramienta oficial:
`https://developers.google.com/digital-asset-links/tools/generator`
o pegá tu dominio + package ID en el **Statement List Generator**. Debe dar
"success".

---

## 4. Subir a Play Console

1. **Create app** → idioma español, tipo *App*, gratuita.
2. **Store listing**: nombre, descripción corta y larga, icono 512×512
   (usá `icons/icon-512.png`), gráfico destacado 1024×500, y al menos
   2 capturas de pantalla del visor 3D.
3. **Privacy policy**: `https://jimmyrojasmyto-blip.github.io/AndroTec-RBJ-HRD/privacidad.html`
4. **Data safety**: declarар que la app **no recopila ni comparte datos**
   (coincide con `privacidad.html`).
5. **Content rating**: completá el cuestionario. Es contenido educativo /
   científico (morfología celular); no es contenido sexual. Respondé con
   honestidad y quedará apto para la mayoría de edades.
6. **Target audience**: mayores de 13 (o el rango que corresponda); no
   dirigido a menores.
7. **App content**: sin anuncios, sin compras.
8. **Release → Internal testing**: subí el `app-release-signed.aab`, agregá
   tu correo como tester, y probá la instalación desde el enlace de prueba.
9. Cuando funcione, promové a **Producción** y enviá a revisión
   (suele tardar de unas horas a unos días).

---

## 5. Actualizaciones futuras

- **Contenido del museo** (páginas, modelos, textos): solo `git push`. La app
  lo toma sola. Acordate de subir `SHELL_VERSION` en `sw.js` (`"v2"` → `"v3"`).
- **La app en sí** (icono, nombre, comportamiento del envoltorio): volvé a
  correr PWABuilder **con el mismo `signing.keystore`**, subí
  `appVersionCode` (2, 3, 4…) y `appVersionName`, y subí el nuevo `.aab` a
  Play Console.
