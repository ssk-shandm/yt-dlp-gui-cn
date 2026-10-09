import type zhCN from '../zh-CN/downloads'

const messages: typeof zhCN = {
  summary: {
    label: 'This run',
    title: 'Downloads',
    running: 'Running',
    finished: 'Finished',
  },
  tabs: {
    downloading: 'Downloading',
    finished: 'Finished',
  },
  running: {
    hint: 'Up to 4 tasks can run at once. Closing the app stops unfinished tasks.',
    empty: 'No running tasks',
  },
  finished: {
    hint: 'Only tasks finished during this run are shown. The list clears when the app restarts; downloaded files are not deleted.',
    empty: 'No finished tasks',
  },
  columns: {
    id: 'ID',
    task: 'Task',
    result: 'Result',
    details: 'Details',
    status: 'Status',
    action: 'Action',
  },
  status: {
    success: 'Completed',
    error: 'Failed',
    cancelled: 'Cancelled',
    running: 'Running',
  },
  cancel: 'Cancel',
}

export default messages
