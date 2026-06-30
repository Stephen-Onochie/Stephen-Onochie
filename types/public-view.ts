// Owner-editable settings that drive the public portfolio. Stored per user in
// public_view_settings; the public site reads them through /api/public/public-view.

export interface PublicViewSettings {
  user_id: string
  resume_url: string
  resume_heading: string
  resume_blurb: string
  show_currently_reading: boolean
  github_url: string
  linkedin_url: string
  instagram_url: string
  created_at: string
  updated_at: string
}

// The public-safe subset returned to the unauthenticated homepage.
export interface PublicViewData {
  resumeUrl: string
  resumeHeading: string
  resumeBlurb: string
  showCurrentlyReading: boolean
  githubUrl: string
  linkedinUrl: string
  instagramUrl: string
}

// Defaults reproduce the previously-hardcoded public site, used as the fallback
// while the live values load (and if the row doesn't exist yet).
export const PUBLIC_VIEW_DEFAULTS: PublicViewData = {
  resumeUrl: 'https://drive.google.com/file/d/1wwWW8jbMPgyqH5YyqObefPECvoomPn7N/view?usp=sharing',
  resumeHeading: 'Resume',
  resumeBlurb: 'Download a PDF overview of engineering experience, projects, and leadership.',
  showCurrentlyReading: true,
  githubUrl: 'https://github.com/Stephen-Onochie',
  linkedinUrl: 'https://linkedin.com/in/stephen-onochie-305760235',
  instagramUrl: 'https://www.instagram.com/stephenconochie/',
}
