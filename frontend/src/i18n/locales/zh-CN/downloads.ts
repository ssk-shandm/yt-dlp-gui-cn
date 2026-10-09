export default {
  summary: {
    label: '本次运行',
    title: '下载任务',
    running: '运行中',
    finished: '已结束',
  },
  tabs: {
    downloading: '下载中',
    finished: '已结束',
  },
  running: {
    hint: '运行中的任务最多 4 个；关闭应用会终止未完成任务。',
    empty: '暂无运行中的任务',
  },
  finished: {
    hint: '仅显示本次运行已结束的任务，重启应用后清空；下载文件不会删除。',
    empty: '暂无已结束的任务',
  },
  columns: {
    id: 'ID',
    task: '任务',
    result: '结果',
    details: '说明',
    status: '状态',
    action: '操作',
  },
  status: {
    success: '已完成',
    error: '失败',
    cancelled: '已取消',
    running: '运行中',
  },
  cancel: '取消',
}
