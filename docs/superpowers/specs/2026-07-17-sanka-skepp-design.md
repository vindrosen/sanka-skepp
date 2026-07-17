# Design – Sänka Skepp (Webb + Mobil PWA)

Datum: 2026-07-17. Baserad på den detaljerade kravspecen i `/goal` samt `Mockup.png` i projektroten.
Spelet byggs autonomt enligt spec; denna fil dokumenterar arkitekturbesluten.

## Mål

Premium Sänka Skepp-spel som PWA. Mörk marinblå design med glasmorphism och neonblå
detaljer (se mockupen), mjuka animationer, syntetiserade ljudeffekter, AI i tre nivåer,
statistik, prestationer, inställningar och två spelare på samma enhet.

## Teknikval

- **Vite + React 18 + TypeScript** – snabb utveckling, komponentstruktur enligt krav.
- **Tailwind CSS v4** (`@tailwindcss/vite`) – samma stack som FårJagDra, fungerar bra.
- **Zustand** för globalt speltillstånd. OBS: selektera råa värden + `useMemo`
  (kända selektorfällan med nya arrayer ⇒ oändlig loop).
- **vite-plugin-pwa** – manifest + service worker för installerbarhet/offline.
- **LocalStorage** via små `persist`-hjälpare för inställningar, statistik, prestationer.
- **Web Audio API** – alla ljudeffekter och ambient musik syntetiseras i kod
  (inga ljudfiler behövs; av/på-reglage i inställningar).
- **Bildgen-MCP (OpenAI)** – genererar PNG-bilder: hjältebakgrund, havsbakgrunder,
  fartyg (ovanifrån, transparent bakgrund), effekt-sprites och appikon.
  Sparas i `public/assets/generated/`.

## Arkitektur

```
src/
  game/          – ren spellogik utan React (testbar med Vitest)
    constants.ts – bräde 10x10, fartygsdefinitioner (5/4/3/3/2)
    board.ts     – placering, validering, slumpad utplacering
    engine.ts    – skott, träff/miss/sänkt, vinstkontroll
    ai.ts        – Lätt (slump), Medel (jakt runt träffar),
                   Svår (sannolikhetskarta + parity + minne)
  state/         – Zustand-store (skärmnavigering, pågående match),
                   persistens för settings/stats/achievements
  i18n/          – sv/en-ordbok + useTranslation-hook
  audio/         – WebAudio-syntes: explosion, plask, sänkt, klick, fanfar, musikloop
  components/
    screens/     – Meny, Placering, Spel, Överlämning (2 spelare), Resultat,
                   Inställningar, Statistik, Prestationer
    ui/          – GlassPanel, NeonButton, Board (rutnät), ShipSprite,
                   effekter (Explosion, Splash, Smoke, Sinking) i CSS + sprites
```

## Spelflöde

Meny → välj läge (dator: välj svårighetsgrad / två spelare) → placering (drag & drop
med mus- och touch-events, rotation via knapp eller tryck på placerat fartyg, slumpa,
töm) → spel med två brädor (egen + motståndarens; på mobil stackas de) →
tur-baserat med AI-drag efter kort fördröjning; i 2P-läge en "lämna över enheten"-skärm →
resultat med matchstatistik → statistik/prestationer uppdateras i LocalStorage.

## AI Svår

Sannolikhetskarta: för varje kvarvarande fartyg räknas alla giltiga placeringar över
okända rutor; rutor med öppna träffar viktas kraftigt (placeringar som täcker träffar
prioriteras). Skjuter alltid rutan med högst vikt. Ger effektiv jakt + parity-effekt
automatiskt.

## Prestationer (8 st)

Första vinsten, 10 vinster, 100 vinster, Perfekt spel (vinst utan miss), Vinn på Svår,
20 matcher spelade, Vinstsvit 5, Sänk alla 5 fartyg i en match utan att förlora eget
fartyg helt (Flottamiral). Lagras som id + upplåsningsdatum.

## Ej i scope (framtida)

Online multiplayer, ranking, vänner, chatt, dagliga utmaningar, butik/valutor från
mockupen, specialvapen, cloud save.
