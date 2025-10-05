# PLANmy · Simulador de financiación

App web (PWA) que calcula cuotas con **valor residual** a partir de un CSV con condiciones por producto.

## Cómo usar
1. Sube el contenido de esta carpeta a un repositorio en GitHub (por ejemplo `planmy`) y activa **GitHub Pages** con la rama `main` y la carpeta raíz (`/`).  
2. Abre la URL de Pages. En la parte superior pulsa **“Cargar datos (CSV)”** y selecciona tu archivo.
3. Elige **Familia**, **Producto**, escribe **Precio** (base para el residual) y **Oferta** (base para las cuotas), y selecciona **Meses**.
4. Instálala en tu iPhone/Android desde el menú del navegador (es una **PWA**). Funciona offline tras la primera carga.

## Formato del CSV
Encabezados mínimos (no sensibles a mayúsculas/acentos y se admiten sinónimos):
- `Familia` — grupo/tipo (p. ej. *iPhone*)
- `Producto` — modelo (p. ej. *iPhone 16*)
- `Residual%` — porcentaje para el **valor residual**
- `Meses` — opciones separadas por `|`, `,`, `/` o espacio (ej.: `24|36`)
- `TIN%` — interés nominal anual
- `Gastos` *(opcional)* — comisiones/gastos

> También se aceptan los encabezados: `Tipo`, `Plazos`, `Interés`…

## Cálculos
- **Valor residual** = `Precio base × Residual%`  
- **Cuota mensual** con **globo final** (balloon):  
  \[ \text{Cuota} = \frac{\big(PV - \frac{FV}{(1+i)^N}\big)\, i}{1 - (1+i)^{-N}} \]  
  donde `PV` = *Oferta*, `FV` = *Valor residual*, `N` = meses, `i` = `TIN/12`.
- **TAE** aproximada: \( (1 + TIN/12)^{12} - 1 \).
- **Total adeudado** = suma de cuotas + última cuota + gastos.
- **Intereses** = Total adeudado − Oferta.

## Personalización
- Estilos en `index.html` (bloque `<style>`).  
- Iconos y logotipo en `assets/`.

---

© PLANmy
