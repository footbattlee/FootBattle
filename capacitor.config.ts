import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.footbattle.app',
  appName: 'FootBattle',
  webDir: 'www',
  server: {
    url: 'https://foot-battle-git-mobile-auth-push-clean-v2-footbatlee.vercel.app/tr',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
