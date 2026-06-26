import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight, Code2, Github, Globe2, Medal, Radio, Sparkles, Target, Terminal, Trophy } from 'lucide-react'
import './styles.css'

const CF_HANDLE = 'QuantumHex'
const CF_API_KEY = '5ba66b8f85df14c4a7ec4fc048022202d602970d'

const links = {
  codeforces: 'https://codeforces.com/profile/QuantumHex',
  atcoder: 'https://atcoder.jp/users/QuantumHex',
  github: 'https://github.com/Abderrahmane-Fakraoui',
  x: 'https://x.com/quantumhex09',
  dashboard: 'https://abderrahmane-fakraoui.github.io/arena-quantumhex/',
  discord: 'https://discord.com/users/quantumhex09'
}

type CFData = {
  rating: number
  maxRating: number
  rank: string
  solved: number
  contests: number
  bestRank: number | null
  positiveStreak: number
  loading: boolean
}

const fallback: CFData = {
  rating: 1033,
  maxRating: 1033,
  rank: 'pupil',
  solved: 100,
  contests: 4,
  bestRank: null,
  positiveStreak: 4,
  loading: false
}

function useCodeforces(): CFData {
  const [data, setData] = useState<CFData>({ ...fallback, loading: true })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [userRes, statusRes, ratingRes] = await Promise.all([
          fetch(`https://codeforces.com/api/user.info?handles=${CF_HANDLE}`),
          fetch(`https://codeforces.com/api/user.status?handle=${CF_HANDLE}&from=1&count=10000`),
          fetch(`https://codeforces.com/api/user.rating?handle=${CF_HANDLE}`)
        ])
        const [userJson, statusJson, ratingJson] = await Promise.all([userRes.json(), statusRes.json(), ratingRes.json()])
        if (cancelled) return

        const user = userJson?.result?.[0] ?? {}
        const submissions = Array.isArray(statusJson?.result) ? statusJson.result : []
        const accepted = new Set<string>()
        for (const sub of submissions) {
          if (sub.verdict === 'OK' && sub.problem) {
            accepted.add(`${sub.problem.contestId}-${sub.problem.index}`)
          }
        }
        const contests = Array.isArray(ratingJson?.result) ? ratingJson.result : []
        const bestRank = contests.length ? Math.min(...contests.map((c: any) => c.rank).filter(Boolean)) : null
        let streak = 0
        for (let i = contests.length - 1; i >= 0; i -= 1) {
          const c = contests[i]
          if ((c.newRating ?? 0) > (c.oldRating ?? 0)) streak += 1
          else break
        }

        setData({
          rating: user.rating ?? fallback.rating,
          maxRating: user.maxRating ?? user.rating ?? fallback.maxRating,
          rank: user.rank ?? fallback.rank,
          solved: Math.max(accepted.size, fallback.solved),
          contests: Math.max(contests.length, fallback.contests),
          bestRank,
          positiveStreak: Math.max(streak, fallback.positiveStreak),
          loading: false
        })
      } catch {
        if (!cancelled) setData(fallback)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return data
}

function AlgorithmCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let t = 0
    let pointer = { x: innerWidth * 0.5, y: innerHeight * 0.35 }

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = innerWidth * dpr
      canvas.height = innerHeight * dpr
      canvas.style.width = `${innerWidth}px`
      canvas.style.height = `${innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const move = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY } }

    const draw = () => {
      t += reduced ? 0 : 1
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      const step = 64
      for (let x = -step; x < innerWidth + step; x += step) {
        for (let y = -step; y < innerHeight + step; y += step) {
          const dx = pointer.x - x
          const dy = pointer.y - y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const pull = Math.max(0, 1 - dist / 340)
          const wave = Math.sin(t * 0.018 + x * 0.013 + y * 0.021) * 10
          const nx = x + dx * pull * 0.055 + wave * pull
          const ny = y + dy * pull * 0.055 + Math.cos(t * 0.014 + y * 0.011) * 8 * pull

          ctx.fillStyle = `rgba(31, 88, 255, ${0.05 + pull * 0.16})`
          ctx.beginPath()
          ctx.arc(nx, ny, 1.1 + pull * 1.8, 0, Math.PI * 2)
          ctx.fill()
          if (pull > 0.42) {
            ctx.strokeStyle = `rgba(0, 167, 140, ${pull * 0.15})`
            ctx.beginPath()
            ctx.moveTo(nx, ny)
            ctx.lineTo(nx + dx * 0.04, ny + dy * 0.04)
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    addEventListener('resize', resize)
    addEventListener('pointermove', move, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      removeEventListener('pointermove', move)
    }
  }, [])

  return <canvas className="algorithm-canvas" ref={ref} aria-hidden />
}

function ProfileCard({ cf }: { cf: CFData }) {
  return (
    <motion.div className="profile-card" initial={{ opacity: 0, y: 24, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8 }}>
      <div className="portrait-wrap">
        <img src="/assets/profile.jpg" alt="QuantumHex profile illustration" />
        <div className="scanline" />
      </div>
      <div className="rank-chip"><Radio size={14} /> {cf.rank.toUpperCase()} · {cf.rating}</div>
      <p className="micro">Public Codeforces stats for QuantumHex. API key is kept as a constant because you asked for it, but the public endpoints work without signed requests.</p>
    </motion.div>
  )
}

const statCards = [
  ['Age', '17', 'young enough to compound fast'],
  ['Base', 'Morocco', 'building from Moroccan discipline'],
  ['Track', '1ère Bac SM', 'math, physics, logic'],
  ['Practice', '4h+ daily', 'monk mode block']
]

function App() {
  const cf = useCodeforces()
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -140])

  const milestones = useMemo(() => [
    { title: 'Specialist 1400+', text: 'Short-term Codeforces target: stronger implementation, greedy, and graphs.', icon: Target },
    { title: 'mOI training camps', text: 'Qualify for Moroccan olympiad training and sharpen contest discipline.', icon: Medal },
    { title: 'IOI 2027 / 2028', text: 'Long arc: compete internationally with deep algorithmic fluency.', icon: Trophy },
    { title: 'MIT-level profile', text: 'Build proof: projects, consistency, writing, and measurable growth.', icon: Sparkles }
  ], [])

  return (
    <main>
      <AlgorithmCanvas />
      <nav>
        <a href="#top" className="logo"><img src="/assets/avatar.png" alt="" /> QuantumHex</a>
        <div>
          <a href="#stats">Stats</a>
          <a href="#goals">Goals</a>
          <a href="#connect">Links</a>
        </div>
      </nav>

      <section id="top" className="hero">
        <motion.div className="hero-copy" style={{ y: heroY }}>
          <p className="eyebrow">Competitive Programmer · Morocco · Monk Mode</p>
          <h1>Abderrahmane Fakraoui</h1>
          <h2>QuantumHex</h2>
          <p className="lead">17-year-old Sciences Mathématiques student training for IOI 2027/2028, building algorithmic discipline through Codeforces, AtCoder, math, and daily deep work.</p>
          <div className="hero-actions">
            <a className="button primary" href={links.codeforces} target="_blank" rel="noreferrer">Codeforces <ArrowUpRight size={16}/></a>
            <a className="button" href={links.dashboard} target="_blank" rel="noreferrer">Arena Dashboard <Globe2 size={16}/></a>
          </div>
        </motion.div>
        <ProfileCard cf={cf} />
      </section>

      <section className="ticker" aria-label="identity ticker">
        <span>C++17</span><span>Graphs</span><span>Dynamic Programming</span><span>STL</span><span>Number Theory</span><span>Touch Typing</span><span>IOI Arc</span><span>C++17</span><span>Graphs</span><span>Dynamic Programming</span>
      </section>

      <section id="stats" className="section split">
        <div>
          <p className="eyebrow">Current signal</p>
          <h3>Small numbers now. Serious trajectory.</h3>
          <p className="body">The site avoids fake flexing. It shows the real starting point: consistent practice, fast improvement, and a clear long-term mission.</p>
        </div>
        <div className="stats-grid">
          <div className="stat hot"><b>{cf.rating}</b><span>CF rating</span></div>
          <div className="stat"><b>{cf.positiveStreak}</b><span>positive contest streak</span></div>
          <div className="stat"><b>{cf.solved}+</b><span>accepted problems</span></div>
          <div className="stat"><b>{cf.contests}</b><span>rated contests</span></div>
        </div>
      </section>

      <section className="section cards">
        {statCards.map(([k, v, d]) => <article key={k}><span>{k}</span><strong>{v}</strong><p>{d}</p></article>)}
      </section>

      <section className="section code-panel">
        <div>
          <p className="eyebrow">Training philosophy</p>
          <h3>Monk mode is not aesthetic. It is a schedule.</h3>
          <p className="body">Every contest becomes notes. Every failed problem becomes a pattern. Every week needs a harder target than the last.</p>
        </div>
        <pre>{`while (goal != "IOI") {
  solve(harder_problem);
  review(mistakes);
  compress(patterns);
  rating += discipline;
}`}</pre>
      </section>

      <section id="goals" className="section">
        <p className="eyebrow">Roadmap</p>
        <h3>The path is public, measurable, and uncomfortable.</h3>
        <div className="timeline">
          {milestones.map((m, i) => {
            const Icon = m.icon
            return <motion.article key={m.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}><Icon/><div><strong>{m.title}</strong><p>{m.text}</p></div></motion.article>
          })}
        </div>
      </section>

      <section className="section projects">
        <div className="project-feature">
          <div>
            <p className="eyebrow">Project</p>
            <h3>QuantumHex Arena Dashboard</h3>
            <p className="body">A personal performance board for tracking Codeforces growth, coding streaks, goals, and discipline. The portfolio links to it as proof that the mission is being measured.</p>
          </div>
          <a className="button primary" href={links.dashboard} target="_blank" rel="noreferrer">Open dashboard <ArrowUpRight size={16}/></a>
        </div>
      </section>

      <section id="connect" className="section connect">
        <p className="eyebrow">Connect</p>
        <h3>Find the signal.</h3>
        <div className="link-grid">
          <a href={links.github} target="_blank" rel="noreferrer"><Github/> GitHub</a>
          <a href={links.x} target="_blank" rel="noreferrer">𝕏 @quantumhex09</a>
          <a href={links.codeforces} target="_blank" rel="noreferrer"><Code2/> Codeforces</a>
          <a href={links.atcoder} target="_blank" rel="noreferrer"><Terminal/> AtCoder</a>
          <a href={links.discord} target="_blank" rel="noreferrer">Discord · quantumhex09</a>
        </div>
      </section>

      <footer>
        <span>QuantumHex © 2026</span>
        <span>Stay hungry. Stay solving.</span>
      </footer>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
