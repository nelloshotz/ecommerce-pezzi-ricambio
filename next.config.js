/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    // Aggiungi il tuo dominio VPS quando lo configuri
    // domains: ['localhost', 'il-tuo-dominio.com', 'www.il-tuo-dominio.com'],
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

