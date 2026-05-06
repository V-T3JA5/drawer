import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getWeek, WEEKS } from '@data/weeks'
import { useStore } from '@hooks/useStore'

export default function WeekPage() {
  const { weekId } = useParams()
  const navigate = useNavigate()
  const week = getWeek(weekId)

  const { currentStep, setCurrentStep, completedSteps, completeStep, resetWeek } = useStore()

  useEffect(() => {
    resetWeek()
  }, [weekId])

  if (!week) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: '#00d4ff', fontFamily: 'Space Mono' }}>WEEK NOT FOUND</span>
      </div>
    )
  }

  const steps = week.steps.length > 0 ? week.steps : [
    { id: 1, title: 'Content Coming Soon', instruction: 'Questions for this week haven\'t been provided yet.', detail: 'Check back soon — steps will be added in Session 8.' }
  ]

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  const goNext = () => {
    completeStep(currentStep)
    if (!isLast) setCurrentStep(currentStep + 1)
  }

  const goPrev = () => {
    if (!isFirst) setCurrentStep(currentStep - 1)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <aside
        className="tutorial-sidebar"
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          background: 'rgba(2, 12, 20, 0.92)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 24px',
          gap: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          data-hover="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: 'rgba(0,212,255,0.5)',
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            cursor: 'none',
            padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,212,255,0.5)'}
        >
          ← BACK
        </button>

        {/* Week header */}
        <div>
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.25em',
            color: week.color,
            marginBottom: 8,
            opacity: 0.8,
          }}>
            WEEK {String(week.id).padStart(2, '0')}
          </div>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: '#f0f8ff',
            lineHeight: 1.3,
          }}>
            {week.title}
          </div>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '0.75rem',
            color: 'rgba(140,180,210,0.7)',
            marginTop: 4,
          }}>
            {week.subtitle}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,212,255,0.1)' }} />

        {/* Progress / Step list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            color: 'rgba(0,212,255,0.4)',
            marginBottom: 4,
          }}>
            STEPS — {steps.length}
          </div>

          {steps.map((s, i) => {
            const isActive = i === currentStep
            const isDone = completedSteps.includes(i)
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(i)}
                data-hover="true"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  background: isActive ? 'rgba(0,212,255,0.08)' : 'none',
                  border: 'none',
                  borderLeft: `2px solid ${isActive ? '#00d4ff' : isDone ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.1)'}`,
                  padding: '8px 10px',
                  cursor: 'none',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  borderRadius: '0 4px 4px 0',
                }}
              >
                {/* Step number dot */}
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `1px solid ${isActive ? '#00d4ff' : isDone ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'}`,
                  background: isActive ? '#00d4ff' : isDone ? 'rgba(0,212,255,0.25)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                  boxShadow: isActive ? '0 0 8px #00d4ff' : 'none',
                  transition: 'all 0.2s',
                }}>
                  <span style={{
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '0.5rem',
                    color: isActive ? '#000' : isDone ? '#00d4ff' : 'rgba(0,212,255,0.5)',
                    fontWeight: 700,
                  }}>
                    {isDone && !isActive ? '✓' : i + 1}
                  </span>
                </div>

                <span style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '0.75rem',
                  color: isActive ? '#f0f8ff' : 'rgba(140,180,210,0.6)',
                  lineHeight: 1.3,
                  transition: 'color 0.2s',
                }}>
                  {s.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Week nav */}
        <div style={{ display: 'flex', gap: 8 }}>
          {week.id > 1 && (
            <button
              onClick={() => navigate(`/week/${week.id - 1}`)}
              data-hover="true"
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: 4,
                color: 'rgba(0,212,255,0.6)',
                fontFamily: 'Space Mono, monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                cursor: 'none',
                transition: 'all 0.2s',
              }}
            >
              ← W{week.id - 1}
            </button>
          )}
          {week.id < 11 && (
            <button
              onClick={() => navigate(`/week/${week.id + 1}`)}
              data-hover="true"
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: 4,
                color: 'rgba(0,212,255,0.6)',
                fontFamily: 'Space Mono, monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                cursor: 'none',
                transition: 'all 0.2s',
              }}
            >
              W{week.id + 1} →
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────── */}
      <main style={{
        flex: 1,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
      }}>
        {/* Progress bar top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'rgba(0,212,255,0.1)',
        }}>
          <motion.div
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: '#00d4ff',
              boxShadow: '0 0 10px #00d4ff',
            }}
          />
        </div>

        {/* Step card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              maxWidth: '640px',
              width: '100%',
            }}
          >
            {/* Step number */}
            <div style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              color: week.color,
              marginBottom: 16,
              opacity: 0.8,
            }}>
              STEP {String(currentStep + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </div>

            {/* Main card */}
            <div
              className="glass-panel"
              style={{
                padding: '36px',
                borderRadius: '12px',
                marginBottom: 16,
              }}
            >
              <h2 style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                fontSize: '1.4rem',
                color: '#f0f8ff',
                marginBottom: 20,
              }}>
                {step.title}
              </h2>

              {/* Instruction — monospace code-like */}
              <div style={{
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: 8,
                padding: '16px 20px',
                marginBottom: 20,
                fontFamily: 'Space Mono, monospace',
                fontSize: '0.85rem',
                color: '#00d4ff',
                lineHeight: 1.7,
              }}>
                {step.instruction}
              </div>

              {step.detail && (
                <p style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '0.9rem',
                  color: 'rgba(140,180,210,0.8)',
                  lineHeight: 1.7,
                }}>
                  {step.detail}
                </p>
              )}
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button
                onClick={goPrev}
                disabled={isFirst}
                data-hover="true"
                style={{
                  padding: '12px 28px',
                  background: 'transparent',
                  border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: 6,
                  color: isFirst ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.7)',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  cursor: isFirst ? 'default' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                ← PREV
              </button>

              <button
                onClick={goNext}
                data-hover="true"
                style={{
                  padding: '12px 32px',
                  background: isLast ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.1)',
                  border: `1px solid ${isLast ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.25)'}`,
                  borderRadius: 6,
                  color: '#00d4ff',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  cursor: 'none',
                  transition: 'all 0.2s',
                  boxShadow: isLast ? '0 0 20px rgba(0,212,255,0.2)' : 'none',
                }}
              >
                {isLast ? 'COMPLETE ✓' : 'NEXT →'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}
