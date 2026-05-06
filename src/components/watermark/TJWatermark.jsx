import { motion } from 'framer-motion'

export default function TJWatermark() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9990,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        {/* TJ text */}
        <span
          className="watermark-glow"
          style={{
            fontFamily: 'Space Mono, monospace',
            fontWeight: 700,
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            color: '#00d4ff',
            textTransform: 'uppercase',
          }}
        >
          TJ
        </span>

        {/* Thin glow line */}
        <motion.div
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scaleX: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: '20px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
            boxShadow: '0 0 6px #00d4ff',
          }}
        />
      </motion.div>
    </div>
  )
}
