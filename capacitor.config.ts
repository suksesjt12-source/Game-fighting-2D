import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eclipsearena.game',
  appName: 'Eclipse Arena',
  webDir: 'dist',
  backgroundColor: '#090B12',
  android: {
    allowMixedContent: false,
    backgroundColor: '#090B12',
  },
};

export default config;
