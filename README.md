# ASE251S4_T10_mo

Expo and React Native app for managing clients. The client area supports listing, search and filters, viewing and editing records, creating clients, soft deletion, and restoration.

## Run the app

```bash
npm install
npx expo start --web
```

The frontend connects to the T10 backend at `http://127.0.0.1:36045/api/v1` by default. To use another host or port, set `EXPO_PUBLIC_API_URL` in a local `.env.local` file, for example:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:36045/api/v1
```

For Android emulators, the default host is `10.0.2.2`. On a physical device, configure `EXPO_PUBLIC_API_URL` with the computer's LAN address.
