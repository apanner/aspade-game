"use client"

import dynamic from 'next/dynamic'

const AdminPanel = dynamic(() => import('@/components/admin-panel').then(mod => ({ default: mod.AdminPanel })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  )
})

export default function AdminPage() {
  return <AdminPanel />
} 