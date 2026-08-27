import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.footbattle.app',
  appName: 'FootBattle',
  webDir: 'www',
  server: {
    url: 'https://playfootbattle.com/tr',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
