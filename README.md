# Not again

Local-only relapse tracker. Log slips, watch your streak since the last one, and see patterns over time — nothing leaves the device.

Built with Expo + React Native. Data lives in AsyncStorage (`gooned.entries.v1`).

## Preview

![Home — dark](https://pub-c6a134c8e1fd4881a475bf80bc0717ba.r2.dev/not-again/not-today-mock1.png)

![Stats — sites & subjects](https://pub-c6a134c8e1fd4881a475bf80bc0717ba.r2.dev/not-again/not-today-mock2.png)

![Stats — week digest](https://pub-c6a134c8e1fd4881a475bf80bc0717ba.r2.dev/not-again/not-today-mock3.png)

![Home — light](https://pub-c6a134c8e1fd4881a475bf80bc0717ba.r2.dev/not-again/not-today-mock4.png)

## Features

- **Home** — live streak timer since last entry, one-tap `gooned?` CTA, recent log
- **Log sheet** — optional site, who/subject, and custom time (defaults to now)
- **Stats** — period counts, longest stretch, today count, week bars, ranked sites & subjects
- **Theme** — light / dark / system, on-device only

## Stack

- Expo SDK 57 · Expo Router · React Native 0.86
- AsyncStorage for persistence
- Geist + Geist Pixel for type
- Reanimated, gesture handler, Phosphor icons

## Run

```bash
pnpm install
pnpm start        # Expo Dev Tools
pnpm web          # browser
pnpm ios          # native iOS
pnpm android      # native Android
```

Requires Node 20+ and [pnpm](https://pnpm.io).

## Privacy

Everything stays on your phone. No accounts, no analytics, no sync — just a private log you control.
