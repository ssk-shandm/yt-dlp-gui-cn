// Rust AppError payload: `code` is a stable key under `codes.*`, `detail` is raw technical text.
export interface CodedError {
  code: string
  detail?: string
}

export interface VideoFormat {
  id: string
  ext: string | null
  resolution: string | null
  fps: number | null
  vcodec: string
  acodec: string
  vbr: string | null
  abr: string | null
  tbr: string | null
  filesize: string
}
export interface Subtitle { language: string; formats: string }
export interface VideoMetadata {
  title: string | null
  thumbnail: string | null
  formats: VideoFormat[]
  subtitles: Subtitle[]
}
export interface Settings { downloadPath: string; retryTimes: string; concurrentFragments: number; proxyEnabled: boolean; proxyUrl: string }
export interface DownloadRequest {
  url: string
  kind: 'quick' | 'format' | 'combined' | 'subtitle' | 'thumbnail' | 'description'
  formatId?: string
  videoId?: string
  audioId?: string
  containerFormat?: string
  language?: string
}
export interface TaskEvent {
  taskId: number
  kind: string
  status: 'running' | 'success' | 'error' | 'cancelled'
  message: CodedError
}
export interface LogEvent { taskId: number; line: string; notice?: CodedError }
