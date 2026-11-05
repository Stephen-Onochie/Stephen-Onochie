// Every piece of homepage copy that isn't a project lives here. Projects
// (cards + /work pages) are edited in Public View and stored in Supabase.

export const CONTACT_EMAIL = 'stephenconochie@gmail.com'

export const SITE_URL = 'https://www.stephenonochie.com'

export const HERO = {
  eyebrow: 'Computer Engineering · Microelectronics & Semiconductors',
  headline: ['Chip design &', 'embedded systems'],
  intro:
    "I design the boards, write the firmware, and ship the software around them. Right now I'm going deep on silicon through Purdue's STARS Chip Design VIP.",
  location: ['West Lafayette, IN', 'Purdue ECE · Class of 2029'],
}

export const NOW = {
  label: 'Now · Fall 2026',
  items: [
    { kind: 'Building', text: "Spectrometer HAT for Purdue's Mars rover" },
    { kind: 'Building', text: 'Sound-reactive LED light bars on a custom PCB' },
    { kind: 'Next', text: 'STARS Chip Design VIP · Spring 2027' },
  ],
}

export const WORK = {
  heading: 'Hardware first. Software that ships.',
  archive: [
    'SmartShot: computer-vision blaster, C++ servo control',
    'Raven: Raspberry Pi quadcopter',
    'FTC optical odometry: 35% less auto drift',
  ],
}

export type TrackState = 'now' | 'planned' | 'next'

export const SILICON = {
  heading: ['From boards', 'to chips'],
  intro:
    'My concentration is Microelectronics & Semiconductors. This is the path I’m on, updated as each step ships.',
  steps: [
    {
      when: 'Fall 2026',
      state: 'now' as TrackState,
      title: 'PCB design & low-level C',
      text: 'Rover HAT and LED boards in KiCad; ECE 26400 Advanced C.',
    },
    {
      when: 'Winter 2026',
      state: 'planned' as TrackState,
      title: 'First Verilog design',
      text: 'A small RTL block, verified with cocotb, on an FPGA or a Tiny Tapeout shuttle.',
    },
    {
      when: 'Spring 2027',
      state: 'next' as TrackState,
      title: 'STARS: Chip Design VIP',
      text: "Purdue's vertically integrated team, taking a design toward tapeout.",
    },
  ],
}

export const EXPERIENCE = [
  {
    when: 'Jul 2025 – Present',
    role: 'Founder & Lead Engineer',
    org: 'SBS Digital LLC',
    detail:
      'Web apps, storefronts and automated data pipelines for e-commerce and home-care clients; up to 2.3× client revenue in 90-day sprints.',
  },
  {
    when: 'Nov 2022 – May 2026',
    role: 'I.T. & Systems Automation',
    org: 'S&N Home Care',
    detail:
      'IT for 70+ employees; automated workflows cut document processing 70%; company site served 24,000+ users.',
  },
  {
    when: 'Aug 2026 – Present',
    role: 'Resident Assistant',
    org: 'Purdue University Residences',
    detail: 'Community of 46 residents; programming, conflict resolution and on-call crisis response.',
  },
  {
    when: 'Nov 2025 – Present',
    role: 'Assistant Treasurer',
    org: 'Acacia Fraternity',
    detail: 'Audited $33,000 in committee funding and cut $14,790 in excess spend.',
  },
]

export const TOOLS = {
  solid: ['C', 'C++', 'Python', 'KiCad', 'ESP32 / ESP-IDF', 'Linux', 'TypeScript', 'Next.js', 'PostgreSQL'],
  learning: ['Verilog · in progress'],
}

export const AGENCY = {
  name: 'SBS Digital LLC',
  kicker: 'Agency · Web · Automations',
  text: 'Websites, storefronts and automated workflows for small businesses, designed, built and maintained end to end.',
  url: 'https://sitesbystephen.com',
}

export const CONTACT = {
  heading: ['Open to Summer 2027', 'internships'],
  focus: 'Digital design & verification · Embedded systems · Systems software. Open to relocation.',
}
