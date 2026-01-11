/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Escludi pdfkit dal bundling webpack per permettere l'accesso ai file dei font
      config.externals = config.externals || []
      config.externals.push('pdfkit')
    }
    return config
  },
}

module.exports = nextConfig

