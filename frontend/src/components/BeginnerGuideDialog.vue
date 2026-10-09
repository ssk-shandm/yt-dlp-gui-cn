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
        <span class="section-eyebrow">{{ $t('guide.progress', { current: step + 1, total: steps.length }) }}</span>
        <div
          aria-live="polite"
          aria-atomic="true"
        >
          <h2 id="guide-title">{{ currentTitle }}</h2>
          <p id="guide-description">{{ currentDescription }}</p>
        </div>
        <div class="guide-actions">
          <button
            type="button"
            class="skip-action"
            @click="skip"
          >
            {{ $t('guide.skip') }}
          </button>
          <div class="step-actions">
            <button
              v-if="step > 0"
              type="button"
              class="previous-action"
              :disabled="changing"
              @click="previous"
            >
              {{ $t('guide.previous') }}
            </button>
            <button
              type="button"
              class="next-action"
              :disabled="changing"
              @click="next"
            >
              {{ step === steps.length - 1 ? $t('guide.finish') : $t('guide.next') }}
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
import { useI18n } from 'vue-i18n'

interface GuideStep {
  key: string
  selector: string
  path: string
}

const { t } = useI18n()
const router = useRouter()
const visible = ref(false)
const changing = ref(false)
const step = ref(0)
const target = ref<DOMRect | null>(null)
const card = ref<HTMLElement>()
const cardHeight = ref(180)
const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
const steps: GuideStep[] = [
  { key: 'paste', selector: '#video-url', path: '/' },
  { key: 'analyze', selector: '.analyze-btn', path: '/' },
  { key: 'quickDownload', selector: '.quick-btn', path: '/' },
  { key: 'customPage', selector: 'a[href="#/page-two"]', path: '/page-two' },
  { key: 'directory', selector: '[data-guide="download-directory"]', path: '/page-two' },
  { key: 'retry', selector: '[data-guide="retry-limit"]', path: '/page-two' },
  { key: 'subtitles', selector: '[data-guide="subtitles"] .box-heading', path: '/page-two' },
  { key: 'videoAudio', selector: '[data-guide="video-audio-quality"]', path: '/page-two' },
  { key: 'container', selector: '[data-guide="container-format"]', path: '/page-two' },
  { key: 'customStart', selector: '[data-guide="custom-download"]', path: '/page-two' },
  { key: 'formatFilter', selector: '[data-guide="format-filter"]', path: '/page-two' },
  { key: 'tasks', selector: 'a[href="#/page-three"]', path: '/page-three' },
  { key: 'logs', selector: 'a[href="#/page-four"]', path: '/page-four' },
  { key: 'copyLogs', selector: '[data-guide="copy-logs"]', path: '/page-four' },
  { key: 'tools', selector: '[data-guide="install-tools"]', path: '/about' },
  { key: 'updates', selector: '[data-guide="check-updates"]', path: '/about' },
]
const current = computed(() => steps[step.value]!)
const currentTitle = computed(() => t(`guide.steps.${current.value.key}.title`))
const currentDescription = computed(() => t(`guide.steps.${current.value.key}.description`))
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
