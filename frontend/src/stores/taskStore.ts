import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskEvent } from '@/types/desktop'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskEvent[]>([])
  function updateTask(task: TaskEvent) {
    const index = tasks.value.findIndex((item) => item.taskId === task.taskId)
    if (index < 0) tasks.value.unshift(task)
    else tasks.value[index] = task
    // Retain at most 200 terminal tasks; never remove an active task.
    const active = tasks.value.filter((item) => item.status === 'running')
    const completed = tasks.value.filter((item) => item.status !== 'running').slice(0, 200)
    tasks.value = [...active, ...completed].sort((a, b) => b.taskId - a.taskId)
  }
  return { tasks, updateTask }
})
