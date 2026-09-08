'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

import { LandingExperience } from '@/components/session/LandingExperience'

const DevelopmentMonitor = dynamic(
  () => import('@/components/monitor/MonitorPage').then((module) => module.MonitorPage),
  { ssr: false, loading: () => <div className="fixed inset-0 bg-monitor-bg" /> },
)

function Entry() {
  const params = useSearchParams()
  const dev = params.get('dev')
  if (dev === '1' || dev === '2') return <DevelopmentMonitor />
  return <LandingExperience key={params.toString()} />
}

export function LandingRoute() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-monitor-bg" />}>
      <Entry />
    </Suspense>
  )
}
