// TODO: implement — Phase 3 (Monitor UI)
export default function MonitorPage({ params }: { params: { code: string } }) {
  return (
    <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
      <p className="text-green-400 font-mono">Monitor — Session {params.code}</p>
    </div>
  )
}
