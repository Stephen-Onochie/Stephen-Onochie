export const SITE_FILES_BUCKET = 'site-files'
export const RESUME_DOWNLOAD_NAME = 'Stephen-Onochie-Resume.pdf'
export const RESUME_MAX_BYTES = 10 * 1024 * 1024

export const PDF_MIME = 'application/pdf'
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type ResumeKind = 'pdf' | 'docx'

export function resumeKind(fileName: string): ResumeKind | null {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  return null
}

export function resumePath(userId: string): string {
  return `${userId}/resume.pdf`
}

export interface ResumeFileInfo {
  fileName: string
  size: number
  uploadedAt: string
}
