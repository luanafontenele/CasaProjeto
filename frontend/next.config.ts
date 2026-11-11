import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/categoria',
        destination: '/dispositivo',
        permanent: false,
      },
      {
        source: '/categorias',
        destination: '/dispositivo',
        permanent: false,
      },
      {
        source: '/dipositivo',
        destination: '/dispositivo',
        permanent: false,
      },
      {
        source: '/dipositivos',
        destination: '/dispositivo',
        permanent: false,
      },
      {
        source: '/dispositivos',
        destination: '/dispositivo',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
