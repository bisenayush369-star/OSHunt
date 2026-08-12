import type { NextConfig } from 'next';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' avatars.githubusercontent.com https: data:;
  font-src 'self';
  connect-src 'self' api.github.com;
  frame-ancestors 'none';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy-Report-Only',
    // TODO: switch from Content-Security-Policy-Report-Only to Content-Security-Policy once browser console reports stay clean for a few days.
    value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;