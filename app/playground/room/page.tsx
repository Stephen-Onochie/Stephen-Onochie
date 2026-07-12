import type { Metadata } from 'next'
import PortfolioFonts from '@/components/portfolio/PortfolioFonts'
import RoomExperience from '@/components/dorm/RoomExperience'

export const metadata: Metadata = {
  title: 'Dorm OS · Stephen Onochie',
  description:
    "Stephen's Wiley Hall dorm room as an interactive, spinnable low-poly 3D diorama.",
}

export default function DormRoomPage() {
  return (
    <PortfolioFonts>
      <RoomExperience />
    </PortfolioFonts>
  )
}
