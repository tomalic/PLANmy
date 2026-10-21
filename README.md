# PLANmy · PWA (interfície moderna)

Simulador estàtic per a GitHub Pages. **No conté cap tarifa, preu, Excel ni catàleg comercial.**
Cada company importa el seu fitxer PLANmy `.xlsx` amb el botó de l'aplicació. Tot es llegeix dins del navegador, sense peticions a servidors per processar el fitxer. El catàleg extret es desa en IndexedDB del dispositiu.

## Publicar a GitHub Pages

1. Crea un repositori (preferiblement només amb aquests fitxers). **No hi afegeixis mai cap Excel comercial.**
2. Puja el contingut d'aquesta carpeta a l'arrel del repositori (index.html, app.js, parser.js, etc.).
3. Settings → Pages → Deploy from a branch → `main` → `/(root)`.
4. Obre l'adreça HTTPS de Pages. Per primer cop amb connexió, carrega la PWA i després importa el `.xlsx` des del teu ordinador o mòbil.
5. Els companys fan el mateix als seus dispositius. Carregar un Excel nou **només actualitza aquell dispositiu**.

## Funcionament i privadesa

- La interfície i la biblioteca de descompressió s'inclouen a la carpeta. No hi ha fonts CDN ni scripts externs.
- No hi ha analítica, backend ni API externa. El fitxer no se puja a GitHub ni al servidor.
- IndexedDB conserva només dades necessàries per calcular (models, preus, residuals, TIN, nom i data del fitxer); el fitxer original no es desa ni s'envia.
- Es pot fer servir sense connexió després de la primera visita online, si el navegador admet service workers i no n'esborra la memòria cau.
- Si esborres les dades del navegador o canvies de dispositiu, torna a importar l'Excel.
- El desament local depèn de l'emmagatzematge permès pel navegador (pot no persistir en navegació privada).
- El mode obscur és opcional.

## Fidelitat a l'Excel

Inclou les quatre modalitats conegudes: iPhone 24/36 mensualitats + residual, Watch 24 + residual, iPad/Mac 36 + residual. Importa les taules ocultes de productes i les condicions TIN/plazos dels fulls visibles. Les quotes es calculen amb la PMT de l'Excel, interessos arrodonits mensualment, correcció de la darrera mensualitat, i TAE mitjançant IRR.

**Important:** el parser verifica l'estructura i algunes fórmules essencials per evitar resultats erronis si un Excel futur canvia de format o de criteri. No executa fórmules arbitràries d'Excel i no promet compatibilitat amb qualsevol canvi de fórmula. Cal comparar una mostra de productes amb la calculadora oficial abans de fer ofertes.

## Codis de tercers

`vendor/pako_inflate.min.js` (pako, llicència MIT, fitxer a `vendor/PAKO-LICENSE.txt`) s'utilitza únicament per descomprimir fitxers XLSX al dispositiu.

El gràfic actual de la icona és un símbol provisional. El logo final es farà després.
