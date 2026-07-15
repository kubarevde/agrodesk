import { motion } from 'framer-motion'
import {
  BarChart3,
  Bot,
  Clock,
  FileSpreadsheet,
  Package,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const FEATURES: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: 'Учёт рабочего времени',
    text: 'Открытие и закрытие смен с объектом, типом работ и техникой.',
    icon: Clock,
  },
  {
    title: 'Дашборд в реальном времени',
    text: 'Кто на смене, часы, предупреждения по ТО и KPI хозяйства.',
    icon: BarChart3,
  },
  {
    title: 'Расчёт зарплаты',
    text: 'Ставки, переработки и авторасчёт по сменам.',
    icon: Wallet,
  },
  {
    title: 'Складской учёт',
    text: 'Остатки, движения и контроль минимальных запасов.',
    icon: Package,
  },
  {
    title: 'Telegram-бот',
    text: 'Сотрудники отмечают работу в боте — без лишних приложений.',
    icon: Bot,
  },
  {
    title: 'Экспорт в Excel',
    text: 'Табель, зарплата и отчёты одной кнопкой.',
    icon: FileSpreadsheet,
  },
]

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-24 bg-[var(--landing-section-alt)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold text-[var(--landing-text)] sm:text-3xl">
          Возможности
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--landing-muted)]">
          Всё для ежедневной работы КФХ — от поля до отчётности.
        </p>
        <motion.div
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={item}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="rounded-xl border border-green-100 bg-white p-5 shadow-sm"
            >
              <feature.icon className="size-5 text-[var(--landing-primary)]" />
              <h3 className="mt-3 font-semibold text-[var(--landing-text)]">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--landing-muted)]">{feature.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
