import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MobiFone Sơn La',
    short_name: 'MobiFone SL',
    description: 'Dịch vụ MobiFone tại Sơn La',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0066b3',
    lang: 'vi',
    icons: [
      { src: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
  };
}
