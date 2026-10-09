<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="guide-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      aria-describedby="guide-description"
      @keydown="handleKeydown"
    >
      <div
        class="guide-dimmer"
        :class="{ 'has-target': target }"
        @click="skip"
      />
      <div
        v-if="target"
        class="guide-highlight"
        :style="highlightStyle"
        aria-hidden="true"
      />
      <section
        ref="card"
        class="guide-card"
        :style="cardStyle"
        tabindex="-1"
      >
        <span class="section-eyebrow">新手教程 · {{ step + 1 }} / {{ steps.length }}</span>
        <div
          aria-live="polite"
          aria-atomic="true"
        >
          <h2 id="guide-title">{{ current.title }}</h2>
          <p id="guide-description">{{ current.description }}</p>
        </div>
        <div class="guide-actions">
          <button
            type="button"
            class="skip-action"
            @click="skip"
          >
            跳过
          </button>
          <div class="step-actions">
            <button
              v-if="step > 0"
              type="button"
              class="previous-action"
              :disabled="changing"
              @click="previous"
            >
              上一步
            </button>
            <button
              type="button"
              class="next-action"
              :disabled="changing"
              @click="next"
            >
              {{ step === steps.length - 1 ? '完成' : '下一步' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

interface GuideStep {
  title: string
  description: string
  selector: string
  path: string
}

const router = useRouter()
const visible = ref(false)
const changing = ref(false)
const step = ref(0)
const target = ref<DOMRect | null>(null)
const card = ref<HTMLElement>()
const cardHeight = ref(180)
const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
const steps: GuideStep[] = [
  {
    title: '粘贴视频链接',
    description: '把视频页面的网址粘贴到这里。支持 http 和 https 视频链接。教程只介绍操作，不会自动下载或更改设置。',
    selector: '#video-url',
    path: '/',
  },
  {
    title: '分析链接',
    description: '点击“分析链接”，程序会读取封面、可用画质和字幕信息。请先填写视频链接，按钮才会启用。',
    selector: '.analyze-btn',
    path: '/',
  },
  {
    title: '快速下载',
    description: '分析完成后，点击“快速下载”即可自动选择最佳视频和音频。尚未分析时，按钮显示为灰色。',
    selector: '.quick-btn',
    path: '/',
  },
  {
    title: '自定义下载',
    description: '需要指定画质、音频或字幕时，打开“内容处理”进行选择。接下来介绍这里的下载设置。',
    selector: 'a[href="#/page-two"]',
    path: '/page-two',
  },
  {
    title: '设置下载目录',
    description: '点击“下载目录”选择文件保存位置，下方会显示当前目录。建议在下载前先确认保存位置。',
    selector: '[data-guide="download-directory"]',
    path: '/page-two',
  },
  {
    title: '设置重试次数',
    description: '下载失败时按这里的设置重试，可选 3 次、5 次、10 次或无限。新手建议先用有限次数，避免反复重试。',
    selector: '[data-guide="retry-limit"]',
    path: '/page-two',
  },
  {
    title: '下载字幕',
    description:
      '分析完成后，字幕列表会显示可用语言和格式，点击对应行的“下载”即可保存字幕。列表为空时，当前链接没有可用字幕或尚未完成分析。',
    selector: '[data-guide="subtitles"] .box-heading',
    path: '/page-two',
  },
  {
    title: '选择视频和音频',
    description:
      '在 DIY 下载中分别选择视频画质和音频轨道。选项来自已分析的视频，尚未分析或没有独立轨道时，选项可能为空。',
    selector: '[data-guide="video-audio-quality"]',
    path: '/page-two',
  },
  {
    title: '选择输出格式',
    description: '这里选择合成后文件的封装格式。画质和音频由上一项决定，更换封装格式不会自动提升画质。',
    selector: '[data-guide="container-format"]',
    path: '/page-two',
  },
  {
    title: '开始自定义下载',
    description: '确认视频、音频和格式后，点击“下载”开始合成下载。此操作可能占用较多 CPU；本教程不会触发下载。',
    selector: '[data-guide="custom-download"]',
    path: '/page-two',
  },
  {
    title: '筛选可用格式',
    description:
      '可用格式列表支持筛选仅视频、仅音频或视频加音频。还可以用旁边的排序查看分辨率、大小或码率，按需下载对应格式。',
    selector: '[data-guide="format-filter"]',
    path: '/page-two',
  },
  {
    title: '查看任务',
    description: '在“下载列表”查看下载中的任务、完成状态和保存结果。',
    selector: 'a[href="#/page-three"]',
    path: '/page-three',
  },
  {
    title: '查看详细日志',
    description: '遇到问题时打开“终端显示”，这里会显示解析和下载的详细信息。',
    selector: 'a[href="#/page-four"]',
    path: '/page-four',
  },
  {
    title: '复制日志排查问题',
    description:
      '有日志时点击“复制日志”可复制终端内容，便于排查失败原因。分享前请检查链接等私人信息；没有日志时按钮会禁用。',
    selector: '[data-guide="copy-logs"]',
    path: '/page-four',
  },
  {
    title: '安装下载工具',
    description:
      '解析和下载需要 yt-dlp、FFmpeg 等工具。在“关于”页点击此按钮选择基础版或完整版并安装；首次安装需要网络，教程不会开始安装。',
    selector: '[data-guide="install-tools"]',
    path: '/about',
  },
  {
    title: '检查软件更新',
    description:
      '点击“检查并安装更新”可手动安装正式版更新，也可在上方设置自动检测。安装成功后会重启程序，建议先完成当前任务。',
    selector: '[data-guide="check-updates"]',
    path: '/about',
  },
]
const current = computed(() => steps[step.value]!)
const highlightStyle = computed(() =>
  target.value
    ? {
        top: `${target.value.top - 6}px`,
        left: `${target.value.left - 6}px`,
        width: `${target.value.width + 12}px`,
        height: `${target.value.height + 12}px`,
      }
    : {},
)
const cardStyle = computed(() => {
  const margin = 20
  const gap = 18
  const width = Math.min(330, viewport.value.width - margin * 2)
  if (!target.value) return { top: '50%', left: '50%', width: `${width}px`, transform: 'translate(-50%, -50%)' }
  const height = cardHeight.value
  const below = target.value.bottom + gap + height <= viewport.value.height - margin
  const above = target.value.top - gap - height >= margin
  const top = below ? target.value.bottom + gap : above ? target.value.top - gap - height : margin
  const left = Math.min(Math.max(margin, target.value.left), viewport.value.width - width - margin)
  return { top: `${top}px`, left: `${left}px`, width: `${width}px` }
})

let targetElement: Element | null = null
let trackingFrame = 0
let revision = 0
let previousFocus: HTMLElement | null = null

function waitForFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}
function stopTracking() {
  cancelAnimationFrame(trackingFrame)
  trackingFrame = 0
  targetElement = null
  target.value = null
}
function measureTarget() {
  if (viewport.value.width !== window.innerWidth || viewport.value.height !== window.innerHeight) {
    viewport.value = { width: window.innerWidth, height: window.innerHeight }
  }
  cardHeight.value = card.value?.offsetHeight ?? 180
  if (!targetElement?.isConnected) {
    target.value = null
    return
  }
  const rect = targetElement.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    target.value = null
    return
  }
  const old = target.value
  if (
    !old ||
    old.top !== rect.top ||
    old.left !== rect.left ||
    old.width !== rect.width ||
    old.height !== rect.height
  ) {
    target.value = rect
  }
}
function trackTarget() {
  if (!visible.value) return
  // Follow layout/route transitions and scrolling without hiding the spotlight each frame.
  measureTarget()
  trackingFrame = requestAnimationFrame(trackTarget)
}
async function showStep(index: number) {
  const request = ++revision
  changing.value = true
  stopTracking()
  step.value = index
  try {
    await router.push(current.value.path)
    await nextTick()
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (!visible.value || request !== revision) return
      const element = document.querySelector(current.value.selector)
      const rect = element?.getBoundingClientRect()
      if (element && rect?.width && rect.height) {
        targetElement = element
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
        trackTarget()
        break
      }
      await waitForFrame()
    }
    if (visible.value && request === revision) {
      await nextTick()
      card.value?.focus({ preventScroll: true })
    }
  } finally {
    if (request === revision) changing.value = false
  }
}
async function open() {
  if (visible.value) return
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  visible.value = true
  await showStep(0)
}
function skip() {
  revision += 1
  visible.value = false
  changing.value = false
  stopTracking()
  previousFocus?.focus({ preventScroll: true })
  previousFocus = null
}
async function next() {
  if (changing.value) return
  if (step.value >= steps.length - 1) {
    skip()
    return
  }
  await showStep(step.value + 1)
}
async function previous() {
  if (!changing.value && step.value > 0) await showStep(step.value - 1)
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    skip()
  } else if (event.key === 'Tab') {
    const buttons = card.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    if (!buttons?.length) return
    const first = buttons[0]!
    const last = buttons[buttons.length - 1]!
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === card.value)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || active === card.value)) {
      event.preventDefault()
      first.focus()
    }
  }
}
onMounted(() => window.addEventListener('start-beginner-guide', open))
onBeforeUnmount(() => {
  revision += 1
  stopTracking()
  window.removeEventListener('start-beginner-guide', open)
})
</script>

<style scoped>
.guide-layer {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.guide-dimmer {
  position: absolute;
  inset: 0;
  background: rgba(15, 30, 48, 0.68);
}
/* Only the spotlight's outer shadow dims the page; leave its center unobscured. */
.guide-dimmer.has-target {
  background: transparent;
}
.guide-highlight {
  position: fixed;
  z-index: 1;
  box-sizing: border-box;
  border: 3px solid #fff;
  border-radius: 10px;
  box-shadow:
    0 0 0 4px var(--ui-accent),
    0 0 0 9999px rgba(15, 30, 48, 0.68);
  pointer-events: none;
}
.guide-card {
  position: fixed;
  z-index: 2;
  width: min(330px, calc(100vw - 40px));
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
  border: 2px solid var(--ui-accent);
  border-radius: 14px;
  color: var(--ui-text);
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.guide-card h2 {
  margin: 8px 0 6px;
  font-size: 18px;
}
.guide-card p {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 13px;
  line-height: 1.8;
}
.guide-card:focus {
  outline: none;
}
.guide-actions,
.step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.guide-actions {
  justify-content: space-between;
  margin-top: 18px;
}
.guide-actions button {
  padding: 8px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}
.skip-action {
  border: 0;
  color: var(--ui-text-muted);
  background: transparent;
}
.previous-action {
  border: 1px solid var(--ui-border);
  color: var(--ui-text);
  background: #fff;
}
.next-action {
  border: 1px solid var(--ui-accent);
  color: #fff;
  background: var(--ui-accent);
}
.guide-actions button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.guide-actions button:focus-visible {
  outline: 3px solid #80b8f8;
  outline-offset: 3px;
}
</style>
