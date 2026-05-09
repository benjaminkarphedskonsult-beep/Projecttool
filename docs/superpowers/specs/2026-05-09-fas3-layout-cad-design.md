# Fas 3 — Layout-förbättringar + CAD-flik

**Datum:** 2026-05-09  
**Projekt:** Solenergi CRM Pro (Projecttool)  
**Status:** Godkänd för implementation

---

## Sammanfattning

Fyra förbättringar av befintlig Layout-canvas + Rapport, samt en helt ny CAD-flik (flik 9) med DXF-export. Electron (.exe) skjuts upp till separat sprint.

---

## 1. Datamodell

### canvasData — utökat format

```js
// Gammalt format (array) — migreras automatiskt vid inläsning
canvasData["1"] = [ ...fields ]

// Nytt format
canvasData["1"] = {
  fields:    [ { id, x, y, cols, rows, orientation, removed } ],
  obstacles: [ { id, x, y, w, h, label } ]
}
// x, y, w, h i px (snappad till 10 px = 10 cm), mätt från takramens övre vänstra hörn
// label: "Skorsten" | "Takfönster" | "Ventilation" | "Övrigt"
```

**Bakåtkompatibilitet:** `useProjectStore` detekterar gammalt format (`Array.isArray`) och migrerar till `{ fields: data, obstacles: [] }` vid inläsning. Befintliga projekt påverkas inte.

**Takramen** beräknas från befintliga `roofPlane.length` och `roofPlane.width` (meter × 100 = px). Inga nya fält i roofPlane behövs.

---

## 2. Layout-canvas (Layout.jsx + canvasRender.js)

### 2a. Takram

- `drawRoofBoundary(ctx, plane)` ritar en blå ram (`roofPlane.length × 100` × `roofPlane.width × 100` px) med måttetiketter i meter ovanför och till höger.
- Panelfält och hinder kan placeras var som helst, men om ett fält hamnar delvis utanför ramen visas en **orange varningstext** i toolbar: "Fält hamnar utanför takplanet". Ingen hård blockering — användaren avgör.

### 2b. Lägesväljare i toolbar

Fyra knappar ersätter nuvarande instruktionstext:

| Läge | Ikon | Beteende |
|------|------|----------|
| Rita fält | ▦ | Nuvarande drag-to-create (oförändrat) |
| Flytta fält | ✥ | Klicka fält → dra till ny snappad position |
| Rita hinder | ⊗ | Drag-to-create röd rektangel, dialog för etikett vid release |
| Hinder (mått) | + | Öppnar formulärdialog |

### 2c. Flytta fält

- I läge "Flytta": `onMouseDown` hittar träffat fält, sparar offset mellan musposition och fältets `(x, y)`.
- `onMouseMove` uppdaterar fältets position i realtid (snap), ritar ghost-overlay.
- `onMouseUp` sparar ny position via `updateCanvasFields`.

### 2d. Hinder — rita på canvas

- Drag-to-create precis som fält, men resulterar i ett obstacle-objekt.
- Ritas som röd/grå rektangel med etikett.
- Klick på hinder i läge "Rita hinder" eller "Flytta" markerar det → "Ta bort hinder"-knapp visas i toolbar.

### 2e. Hinder — formulärdialog

Inline-dialog (ej modal) under toolbar med fält:
- **Typ** (dropdown): Skorsten / Takfönster / Ventilation / Övrigt
- **Från vänsterkant** (m) — konverteras till px × 100, snappad
- **Från överkant** (m) — konverteras till px × 100, snappad
- **Bredd** (m)
- **Höjd** (m)
- Knapp: Placera → lägger till obstacle, stänger dialog

### 2f. canvasRender.js — nya funktioner

```js
drawRoofBoundary(ctx, plane)         // blå ram med måttetiketter
drawObstacles(ctx, obstacles)        // röda rektanglar med etikett
```

`drawLayout` uppdateras att ta emot `{ fields, obstacles }` istället för en flat array, och anropar de nya funktionerna i rätt ordning (boundary → fält → hinder → selected-highlight).

---

## 3. Rapport sida 3 (Report.jsx)

- Ersätter det enda gemensamma canvas med **ett canvas per takplan**.
- Varje takplan renderas i sin faktiska proportion (längd/bredd-ratio bibehållen, max bredd 698 px).
- Rubrik per sektion: `TAKPLAN {n} — {length} × {width} m · {panels} paneler`
- Canvas-refs hanteras med en `useRef`-array som initieras via callback-refs (`ref={el => canvasRefs.current[i] = el}`) — ett per takplan.
- Om sidan blir längre än A4 hanteras det av `@media print` — webbläsaren bryter automatiskt.

---

## 4. CAD-flik (ny: Flik 9)

### Layout

Horisontell splittning:
- **Vänster (~75%):** Skalenlig teknisk ritning på vit bakgrund — takram med måttsättning, panelfält (numrerade kolumner/rader), hinder (etiketterade).
- **Höger (~25%):** Ritningshuvud med:
  - Karpheds logotyp (inbäddad som inline SVG-text i CAD.jsx — ersätts med riktig logga vid behov)
  - Kundnamn, adress
  - Projektnummer (projekt-id)
  - Datum (idag)
  - Skala (1:100)
  - Ritad av: Rasmus Karphed
  - Separator
  - Takplan X av Y
  - Antal paneler
  - Total kWp

### Takplansväljare

Samma knappar som i Layout-fliken. Ritning + ritningshuvud uppdateras per valt takplan.

### Export

| Knapp | Funktion |
|-------|----------|
| Ladda ner DXF | `dxfExport.js` genererar .dxf som ren textsträng, triggar nedladdning via Blob |
| Exportera PNG | `canvas.toDataURL('image/png')` + länk-nedladdning |

### dxfExport.js (ny util)

Genererar DXF R12-format (kompatibelt med AutoCAD, LibreCAD, FreeCAD):
- `LINE`-entiteter för takram och panelgränser
- `SOLID`-entiteter för panelfyllning
- `TEXT`-entiteter för mått och etiketter
- Inga externa beroenden — DXF är ett textformat

---

## 5. Filer som berörs

| Fil | Åtgärd |
|-----|--------|
| `src/pages/Project/Layout.jsx` | Lägesväljare, flytta-logik, hinder-formulär, takram-integration |
| `src/utils/canvasRender.js` | `drawRoofBoundary`, `drawObstacles`, uppdatera `drawLayout` |
| `src/pages/Project/Report.jsx` | Per-takplan canvas-sektioner |
| `src/pages/Project/CAD.jsx` | Ny — teknisk ritning + ritningshuvud + export-knappar |
| `src/utils/dxfExport.js` | Ny — DXF-generator |
| `src/store/useProjectStore.js` | Datamigrering + `updateCanvasObstacles`-action |
| `src/pages/Project/ProjectView.jsx` | Aktivera flik 9 (CAD) |
| `src/utils/__tests__/canvasRender.test.js` | Tester för nya ritfunktioner |
| `src/utils/__tests__/dxfExport.test.js` | Ny — tester för DXF-output |

---

## 6. Ej i scope

- Electron (.exe) — separat sprint
- Redigera befintliga hinders mått efter placering (kan läggas till senare)
- Flernivå-undo (kan läggas till senare)
- Import av DXF (ej planerat)
