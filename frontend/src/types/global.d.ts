declare global {
  interface Window {
    eel: {
      expose: (fn: (...args: any[]) => any, name: string) => void
      frontend_is_ready: () => void
      run_ytdlp: (url: string, retry: string) => Promise<{ status: string; message: string }>
      analyze_url: (url: string) => void 
      list_all_suppost_website: () => void
      select_download_directory: () => void
      download_cover_page: (url: string) => void
      download_video_introduction: (url: string) => void
      download_specific_subtitle: (url: string, langCode: string) => Promise<{ status: string; message: string }>
      download_specific_format: (url: string, formatId: string) => Promise<{ status: string; message: string }>
      download_diy_format: (
        url: string,
        videoId: string,
        audioId: string,
        containerFormat: string,
      ) => Promise<{ status: string; message: string }>
    }
  }
}

export {}
