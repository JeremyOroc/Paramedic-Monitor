// TODO: implement — Phase 6 (Instructor Panel)
export default function InstructorPage({ params }: { params: { code: string } }) {
  return (
    <div className="w-screen h-screen bg-neutral-900 text-white flex items-center justify-center">
      <p className="text-amber-400 font-mono">Instructor — Session {params.code}</p>
    </div>
  )
}
