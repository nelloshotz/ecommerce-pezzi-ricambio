import { notFound } from 'next/navigation'
import { getProductByIdServer, getProductsServer } from '@/lib/products-server'
import ProductDetails from '@/components/product/ProductDetails'

interface ProductPageProps {
  params: {
    id: string
  }
}

export async function generateStaticParams() {
  const products = await getProductsServer() // Solo prodotti attivi (server-side)
  return products.map((product) => ({
    id: product.id,
  }))
}

export default async function ProductPage({ params }: ProductPageProps) {
  // includeInactive = false di default, quindi solo prodotti attivi
  const product = await getProductByIdServer(params.id, false)

  if (!product) {
    notFound()
  }

  return <ProductDetails product={product} />
}

