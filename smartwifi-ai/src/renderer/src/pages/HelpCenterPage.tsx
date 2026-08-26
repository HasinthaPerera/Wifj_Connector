import { useState, useMemo } from 'react'
import {
  HelpCircle,
  Search,
  Wifi,
  Gauge,
  Activity,
  ShieldCheck,
  Wrench,
  Brain,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  BarChart3,
  Terminal,
  BookOpen,
  Lightbulb,
  MessageCircle,
  Keyboard
} from 'lucide-react'
import { Card, CardHeader, CardContent, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   FAQ data model
───────────────────────────────────────────────────────────── */

interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'How does SmartWiFi AI measure signal strength?',
    answer:
      'SmartWiFi AI reads your wireless adapter\'s RSSI (Received Signal Strength Indicator) value through the native netsh wlan interface on Windows, airport utility on macOS, and iwconfig/iw on Linux. The raw dBm value is normalized to a 0–100% quality score, refreshed every 4 seconds by the background telemetry engine.',
    category: 'monitoring',
    tags: ['signal', 'rssi', 'adapter', 'quality']
  },
  {
    id: 'faq-2',
    question: 'What is the AI Diagnosis engine and how does it work?',
    answer:
      'The AI Diagnosis engine analyzes multiple network health dimensions — signal quality, latency patterns, packet loss rates, DNS resolution speed, and bandwidth utilization — to generate intelligent recommendations. It uses a rule-based scoring system that weighs each metric against configurable thresholds and outputs actionable optimization suggestions ranked by impact.',
    category: 'intelligence',
    tags: ['ai', 'diagnosis', 'engine', 'rules']
  },
  {
    id: 'faq-3',
    question: 'Is my data sent to the cloud?',
    answer:
      'No. SmartWiFi AI follows a privacy-first architecture. All network scans, speed test results, telemetry logs, and diagnostic data are stored exclusively in a local SQLite database on your device. No data is transmitted to external servers, and no cloud accounts are required.',
    category: 'privacy',
    tags: ['privacy', 'data', 'cloud', 'local', 'sqlite']
  },
  {
    id: 'faq-4',
    question: 'How do I run a speed test?',
    answer:
      'Navigate to the Speed Test page from the sidebar. Click the "Start Test" button to measure your download speed, upload speed, ping, and jitter. Results are automatically saved to history and can be compared over time in the History and Reports pages.',
    category: 'network',
    tags: ['speed', 'test', 'download', 'upload', 'ping']
  },
  {
    id: 'faq-5',
    question: 'What does DNS Flush do?',
    answer:
      'DNS Flush clears the operating system\'s cached DNS lookup records. This forces your system to re-resolve domain names from scratch, which can fix issues where websites fail to load due to stale or corrupted DNS cache entries. SmartWiFi AI executes the platform-appropriate flush command (ipconfig /flushdns on Windows).',
    category: 'network',
    tags: ['dns', 'flush', 'cache', 'resolve']
  },
  {
    id: 'faq-6',
    question: 'How does the Auto Optimization feature work?',
    answer:
      'Auto Optimization runs a complete diagnostic suite that includes DNS benchmarking, TCP stack reset evaluation, IP lease renewal checks, and adapter configuration analysis. It identifies bottlenecks and applies safe, reversible optimizations automatically. All changes are logged in the System Logs page for full transparency.',
    category: 'intelligence',
    tags: ['auto', 'optimization', 'dns', 'tcp', 'benchmark']
  },
  {
    id: 'faq-7',
    question: 'What is packet loss and why does it matter?',
    answer:
      'Packet loss occurs when data packets traveling across the network fail to reach their destination. Even 1–2% packet loss can degrade video calls, online gaming, and file downloads. SmartWiFi AI continuously monitors packet loss by sending ICMP echo requests to configurable target hosts and tracking the success rate over time.',
    category: 'monitoring',
    tags: ['packet', 'loss', 'icmp', 'ping', 'latency']
  },
  {
    id: 'faq-8',
    question: 'Can I change the theme and accent color?',
    answer:
      'Yes! Navigate to Theme Preferences from the Application section in the sidebar. You can switch between Light, Dark, and System (auto-detect) modes, and choose from 8 accent color palettes including Indigo, Violet, Sky, Emerald, Rose, Amber, Cyan, and Fuchsia. Changes apply instantly across the entire UI.',
    category: 'settings',
    tags: ['theme', 'dark', 'light', 'color', 'accent']
  },
  {
    id: 'faq-9',
    question: 'What is jitter and how is it different from ping?',
    answer:
      'Ping measures the round-trip time for a single packet to travel to a server and back. Jitter measures the variation in ping over time — inconsistent latency. High jitter (>30ms) causes audio stuttering in VoIP calls and rubber-banding in games, even if your average ping is low. SmartWiFi AI tracks both metrics independently.',
    category: 'monitoring',
    tags: ['jitter', 'ping', 'latency', 'voip', 'variation']
  },
  {
    id: 'faq-10',
    question: 'How does the Process Scanner identify bandwidth-heavy apps?',
    answer:
      'The Process Scanner queries the operating system for running processes that have active network connections. It categorizes each process (browser, media, gaming, development, system) and estimates relative network impact based on connection count and process priority. Flagged heavy consumers are highlighted in the Heavy Usage Detection page.',
    category: 'system',
    tags: ['process', 'scanner', 'bandwidth', 'heavy', 'usage']
  },
  {
    id: 'faq-11',
    question: 'What happens when I click "Network Reset"?',
    answer:
      'Network Reset performs a full TCP/IP stack reset by running netsh commands (Windows) to restore networking components to default states. This can resolve persistent connectivity issues caused by corrupted configurations. The operation requires administrator privileges and may briefly interrupt your connection.',
    category: 'network',
    tags: ['network', 'reset', 'tcp', 'netsh', 'admin']
  },
  {
    id: 'faq-12',
    question: 'How often does the telemetry engine refresh data?',
    answer:
      'By default, the global Wi-Fi status polls every 4 seconds. Individual monitoring pages (Ping, Jitter, Signal) have their own configurable intervals. You can adjust the global refresh frequency in Settings > Monitoring & Data, or fine-tune per-page intervals in Auto Refresh Settings.',
    category: 'settings',
    tags: ['refresh', 'interval', 'polling', 'telemetry', 'frequency']
  }
]

/* ─────────────────────────────────────────────────────────────
   Category metadata
───────────────────────────────────────────────────────────── */

interface CategoryMeta {
  id: string
  label: string
  icon: React.ReactNode
  color: string
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'all', label: 'All Topics', icon: <BookOpen size={14} />, color: 'text-primary-500' },
  { id: 'network', label: 'Network & Tools', icon: <Wifi size={14} />, color: 'text-accent-500' },
  { id: 'monitoring', label: 'Monitoring', icon: <Activity size={14} />, color: 'text-warning-500' },
  { id: 'intelligence', label: 'AI & Optimization', icon: <Brain size={14} />, color: 'text-primary-500' },
  { id: 'system', label: 'System', icon: <Terminal size={14} />, color: 'text-danger-500' },
  { id: 'privacy', label: 'Privacy & Security', icon: <ShieldCheck size={14} />, color: 'text-accent-500' },
  { id: 'settings', label: 'Settings & UI', icon: <Wrench size={14} />, color: 'text-warning-500' }
]

/* ─────────────────────────────────────────────────────────────
   Quick-start guide data
───────────────────────────────────────────────────────────── */

interface QuickGuide {
  title: string
  description: string
  icon: React.ReactNode
  steps: string[]
}

const QUICK_GUIDES: QuickGuide[] = [
  {
    title: 'Run Your First Diagnostic',
    description: 'Diagnose your Wi-Fi health in under 30 seconds.',
    icon: <Brain size={20} className="text-primary-500" />,
    steps: [
      'Open "AI Diagnosis" from the Intelligence section',
      'Click "Run Full Diagnostic" to analyze all health dimensions',
      'Review the scored recommendations and apply suggested fixes'
    ]
  },
  {
    title: 'Optimize DNS Performance',
    description: 'Benchmark DNS servers and apply the fastest resolver.',
    icon: <Zap size={20} className="text-accent-500" />,
    steps: [
      'Navigate to "DNS Recommendation" in the Intelligence section',
      'Run the benchmark to test multiple public DNS providers',
      'Apply the fastest server configuration with one click'
    ]
  },
  {
    title: 'Monitor Connection Quality',
    description: 'Set up real-time ping, jitter, and packet loss tracking.',
    icon: <BarChart3 size={20} className="text-warning-500" />,
    steps: [
      'Open "Ping Monitor" from the Monitoring section',
      'Configure your target host (defaults to 8.8.8.8)',
      'Watch live latency charts — anomalies trigger automatic alerts'
    ]
  },
  {
    title: 'Find Bandwidth-Heavy Apps',
    description: 'Identify processes consuming your network resources.',
    icon: <Gauge size={20} className="text-danger-500" />,
    steps: [
      'Go to "Process Scanner" under System',
      'Scan for active network connections per process',
      'Review flagged heavy consumers in "Heavy Usage Detection"'
    ]
  }
]

/* ─────────────────────────────────────────────────────────────
   Keyboard shortcuts data
───────────────────────────────────────────────────────────── */

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string[]; action: string }[]
}

const KEYBOARD_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'B'], action: 'Toggle sidebar collapse' },
      { keys: ['Esc'], action: 'Close modals and drawers' },
      { keys: ['F12'], action: 'Toggle DevTools (development)' }
    ]
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['Ctrl', 'R'], action: 'Refresh current page data' },
      { keys: ['Ctrl', 'Shift', 'T'], action: 'Toggle theme (light/dark)' }
    ]
  }
]

/* ─────────────────────────────────────────────────────────────
   Accordion FAQ Item component
───────────────────────────────────────────────────────────── */

function FaqAccordion({
  item,
  isOpen,
  onToggle
}: {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}): React.JSX.Element {
  const cat = CATEGORIES.find((c) => c.id === item.category)

  return (
    <div
      className={`
        border border-[var(--border-color)] rounded-xl overflow-hidden
        transition-all duration-200
        ${isOpen ? 'shadow-sm bg-surface-50/50 dark:bg-surface-800/30' : 'bg-[var(--bg-card)]'}
      `.trim()}
    >
      <button
        id={`faq-toggle-${item.id}`}
        onClick={onToggle}
        className="
          w-full flex items-start gap-3 px-4 py-3.5 text-left cursor-pointer
          hover:bg-surface-50 dark:hover:bg-surface-800/50
          transition-colors duration-150
        "
        aria-expanded={isOpen}
      >
        <HelpCircle
          size={16}
          className={`flex-shrink-0 mt-0.5 ${isOpen ? 'text-primary-500' : 'text-[var(--text-muted)]'}`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold leading-relaxed ${
              isOpen ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-primary)]'
            }`}
          >
            {item.question}
          </p>
          {!isOpen && cat && (
            <span className={`text-[10px] font-medium ${cat.color} mt-0.5 inline-block`}>
              {cat.label}
            </span>
          )}
        </div>
        <span className="flex-shrink-0 mt-0.5 text-[var(--text-muted)]">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 ml-7 animate-fade-in">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.answer}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="
                  px-2 py-0.5 rounded-full text-[10px] font-medium
                  bg-surface-100 text-[var(--text-muted)]
                  dark:bg-surface-800 dark:text-surface-400
                "
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Help Center Page
───────────────────────────────────────────────────────────── */

export function HelpCenterPage(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return FAQ_DATA.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
      const matchesSearch =
        !query ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some((t) => t.includes(query))
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, activeCategory])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Help Center</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Guides, frequently asked questions, and keyboard shortcuts for SmartWiFi AI
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          id="help-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help topics, FAQs, and guides..."
          className="
            w-full pl-10 pr-4 py-3 rounded-xl text-sm
            bg-[var(--bg-card)] border border-[var(--border-color)]
            text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
            transition-all duration-200
          "
        />
        {searchQuery && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
            {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Quick Start Guides */}
      {!searchQuery && activeCategory === 'all' && (
        <Card padding="md">
          <CardHeader
            title="Quick Start Guides"
            subtitle="Get up and running with the most common workflows"
            icon={<Lightbulb size={16} />}
          />
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_GUIDES.map((guide, idx) => (
              <div
                key={idx}
                className="
                  p-4 rounded-xl border border-[var(--border-color)]
                  bg-surface-50/50 dark:bg-surface-800/30
                  hover:border-primary-300 dark:hover:border-primary-700
                  transition-colors duration-200
                "
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {guide.icon}
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                    {guide.title}
                  </h4>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">{guide.description}</p>
                <ol className="space-y-1.5">
                  {guide.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-[10px] font-bold flex items-center justify-center mt-px">
                        {sIdx + 1}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Category Filters + FAQ List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <Card padding="sm">
            <div className="px-2 pt-1 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Topics
              </p>
              <ul className="space-y-0.5">
                {CATEGORIES.map((cat) => {
                  const count =
                    cat.id === 'all'
                      ? FAQ_DATA.length
                      : FAQ_DATA.filter((f) => f.category === cat.id).length
                  return (
                    <li key={cat.id}>
                      <button
                        id={`help-cat-${cat.id}`}
                        onClick={() => {
                          setActiveCategory(cat.id)
                          setOpenFaqId(null)
                        }}
                        className={`
                          w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
                          transition-colors duration-150 cursor-pointer
                          ${
                            activeCategory === cat.id
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                              : 'text-[var(--text-secondary)] hover:bg-surface-50 dark:hover:bg-surface-800'
                          }
                        `.trim()}
                      >
                        <span className={activeCategory === cat.id ? 'text-primary-500' : cat.color}>
                          {cat.icon}
                        </span>
                        <span className="flex-1 text-left">{cat.label}</span>
                        <Badge size="sm" variant={activeCategory === cat.id ? 'primary' : 'default'}>
                          {count}
                        </Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </Card>
        </div>

        {/* FAQ List */}
        <div className="lg:col-span-3 space-y-2">
          {filteredFaqs.length === 0 ? (
            <Card padding="lg" className="flex flex-col items-center justify-center text-center py-12">
              <Search size={32} className="text-[var(--text-muted)] opacity-40 mb-3" />
              <p className="text-sm font-medium text-[var(--text-primary)]">No matching topics</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Try adjusting your search query or selecting a different category.
              </p>
            </Card>
          ) : (
            filteredFaqs.map((faq) => (
              <FaqAccordion
                key={faq.id}
                item={faq}
                isOpen={openFaqId === faq.id}
                onToggle={() => setOpenFaqId(openFaqId === faq.id ? null : faq.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom Section: Keyboard Shortcuts + Support */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Keyboard Shortcuts */}
        <Card padding="md">
          <CardHeader
            title="Keyboard Shortcuts"
            subtitle="Navigate the application efficiently"
            icon={<Keyboard size={16} />}
          />
          <CardContent className="space-y-4">
            {KEYBOARD_SHORTCUTS.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  {group.title}
                </p>
                <div className="space-y-1.5">
                  {group.shortcuts.map((sc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-xs text-[var(--text-secondary)]">{sc.action}</span>
                      <div className="flex items-center gap-1">
                        {sc.keys.map((key) => (
                          <kbd
                            key={key}
                            className="
                              px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold
                              bg-surface-100 dark:bg-surface-800
                              text-[var(--text-secondary)]
                              border border-[var(--border-color)]
                              shadow-sm
                            "
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Support & Resources */}
        <Card padding="md">
          <CardHeader
            title="Support &amp; Resources"
            subtitle="Get help beyond the built-in guides"
            icon={<MessageCircle size={16} />}
          />
          <CardContent className="space-y-3">
            <a
              href="https://github.com/HasinthaPerera/Wifj_Connector"
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center gap-3 p-3 rounded-xl
                border border-[var(--border-color)]
                bg-surface-50/50 dark:bg-surface-800/30
                hover:border-primary-300 dark:hover:border-primary-700
                transition-colors duration-200 group
              "
            >
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary-50 dark:bg-primary-950">
                <ExternalLink size={16} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  GitHub Repository
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Browse source code, report bugs, and contribute
                </p>
              </div>
            </a>

            <a
              href="https://github.com/HasinthaPerera/Wifj_Connector/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center gap-3 p-3 rounded-xl
                border border-[var(--border-color)]
                bg-surface-50/50 dark:bg-surface-800/30
                hover:border-warning-300 dark:hover:border-warning-700
                transition-colors duration-200 group
              "
            >
              <div className="flex-shrink-0 p-2 rounded-lg bg-warning-50 dark:bg-warning-950">
                <MessageCircle size={16} className="text-warning-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-warning-600 dark:group-hover:text-warning-400 transition-colors">
                  Report an Issue
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Found a bug or have a feature request? Open an issue
                </p>
              </div>
            </a>

            <div className="pt-2 px-1">
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                SmartWiFi AI v1.0.0 &bull; Built with Electron, React, and Vite &bull;
                All diagnostics run locally on your device.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
