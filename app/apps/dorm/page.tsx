import IvenModule from '@/components/iven/IvenModule'
import RoomExperience from '@/components/dorm/RoomExperience'

export default function DormPage() {
  return (
    <IvenModule
      index={14}
      title="Dorm OS"
      right={
        <span className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          WILEY HALL · 3D
        </span>
      }
    >
      <RoomExperience />
    </IvenModule>
  )
}
