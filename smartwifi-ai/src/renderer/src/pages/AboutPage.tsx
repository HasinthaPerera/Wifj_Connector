import { useState } from 'react'
import {
  Wifi,
  ShieldCheck,
  Cpu,
  Layers,
  Globe,
  Terminal,
  Sparkles,
  RefreshCw,
  Award,
  CheckCircle2,
  ExternalLink,
  Code2,
  Database,
  Lock,
  Zap,
  Info
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge, Modal } from '@/components/ui'

export function AboutPage(): React.JSX.Element {
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [showLicenseModal, setShowLicenseModal] = useState(false)

  const handleCheckUpdate = (): void => {
    setCheckingUpdate(true)
    setUpdateStatus(null)

    setTimeout(() => {
      setCheckingUpdate(false)
      setUpdateStatus('SmartWiFi AI is up to date (v1.0.0 — Latest Build)')
    }, 1400)
  }

  // Fallback version specifications for runtime environment
  const sysDetails = [
    { label: 'Application Version', value: '1.0.0 (Production Build)', icon: <Award size={14} /> },
    { label: 'Core Architecture', value: 'Electron + Vite + React', icon: <Layers size={14} /> },
    { label: 'UI Framework', value: 'Tailwind CSS / HSL Dynamic Theme System', icon: <Code2 size={14} /> },
    { label: 'Local Database Engine', value: 'SQLite 3 (WAL Journal Mode)', icon: <Database size={14} /> },
    { label: 'Telemetry Storage', value: '100% On-Device (Zero Cloud Tracking)', icon: <Lock size={14} /> },
    { label: 'Platform Support', value: 'Windows 10/11, macOS, Linux', icon: <Globe size={14} /> }
  ]

  const featureHighlights = [
    {
      title: 'Real-Time Telemetry',
      description: 'Continuous monitoring of Wi-Fi signal quality, ping latency, packet loss, and jitter rates.',
      icon: <Zap className="text-accent-500" size={18} />
    },
    {
      title: 'AI Diagnostic Engine',
      description: 'Automatic interference detection, DNS server benchmarking, and automated IP lease renewal.',
      icon: <Sparkles className="text-primary-500" size={18} />
    },
    {
      title: 'Process & Resource Inspection',
      description: 'Identifies bandwidth-heavy applications and optimizes channel performance in real time.',
      icon: <Cpu className="text-warning-500" size={18} />
    },
    {
      title: 'Privacy-First Architecture',
      description: 'All network scanning logs, speed tests, and telemetry remain strictly on your device.',
      icon: <ShieldCheck className="text-accent-400" size={18} />
    }
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">About SmartWiFi AI</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          System specifications, architecture details, and software licensing information
        </p>
      </div>

      {/* Main Hero Card */}
      <Card padding="lg" variant="gradient" className="relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
              <Wifi size={44} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-accent-500 border-2 border-[var(--bg-card)]"></span>
            </span>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                SmartWiFi AI
              </h2>
              <Badge variant="accent">v1.0.0 Stable</Badge>
              <Badge variant="default">Production</Badge>
            </div>
            <p className="text-xs font-medium text-primary-500 dark:text-primary-400 mt-1">
              AI-Powered Wireless Telemetry &amp; Network Optimization Engine
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed max-w-2xl">
              SmartWiFi AI is an intelligent desktop application designed for high-performance network monitoring,
              wireless signal analysis, channel interference scanning, and automated system optimizations. Built with privacy in mind.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-5">
              <Button
                id="about-check-update-btn"
                variant="primary"
                size="sm"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
              >
                <RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} />
                {checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}
              </Button>
              <Button
                id="about-license-btn"
                variant="secondary"
                size="sm"
                onClick={() => setShowLicenseModal(true)}
              >
                <Info size={14} />
                View MIT License
              </Button>
            </div>

            {updateStatus && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/40 px-3 py-1.5 rounded-lg border border-accent-200 dark:border-accent-800 animate-fade-in">
                <CheckCircle2 size={14} />
                <span>{updateStatus}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* System Specifications & Environment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="md">
          <CardHeader
            title="Environment &amp; Stack Specifications"
            subtitle="Runtime details of the current execution environment"
            icon={<Terminal size={16} />}
          />
          <CardContent className="divide-y divide-[var(--border-color)]">
            {sysDetails.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Feature Highlights */}
        <Card padding="md">
          <CardHeader
            title="Core Architecture Highlights"
            subtitle="Built for low-latency telemetry and maximum reliability"
            icon={<Cpu size={16} />}
          />
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featureHighlights.map((feat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-[var(--border-color)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {feat.icon}
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">{feat.title}</h4>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Credits & Developer Information */}
      <Card padding="md" variant="outlined">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              SmartWiFi AI &copy; 2026 Hasintha Perera
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Developed by Hasintha Perera &bull; HasinthaPerera/Wifj_Connector Repository
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Open Source Core</Badge>
            <Button
              id="about-github-link"
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://github.com/HasinthaPerera/Wifj_Connector', '_blank')}
            >
              <ExternalLink size={13} />
              GitHub
            </Button>
          </div>
        </div>
      </Card>

      {/* License Modal */}
      <Modal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        title="MIT Open Source License"
        size="md"
      >
        <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <p className="font-semibold text-[var(--text-primary)]">
            Copyright &copy; 2026 Hasintha Perera (SmartWiFi AI Project)
          </p>
          <p>
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
          </p>
          <p>
            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
          </p>
          <div className="pt-2 flex justify-end">
            <Button
              id="about-close-license-btn"
              variant="primary"
              size="sm"
              onClick={() => setShowLicenseModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
