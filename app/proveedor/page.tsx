import { redirect } from 'next/navigation'
import ProviderDashboard from '@/components/provider-dashboard'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ProveedorPage() {
  const session = await getSession()

  if (!session || session.role !== 'provider') {
    redirect('/login')
  }

  return <ProviderDashboard />
}
