import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { staggerContainer, staggerItem, fadeInUp, smooth } from "@/lib/motion";

const sections = [
  {
    title: "1. Our Service",
    body: "RepayStream allows businesses to create repayment plans and customers to authorize debits via licensed providers such as Paystack. We act solely as an orchestration layer.",
  },
  {
    title: "2. User Responsibilities",
    items: [
      "You must provide accurate information when creating or authorizing plans.",
      "You are responsible for ensuring you have the legal right to collect the agreed amounts.",
      "Customers must give explicit consent before any debit is scheduled.",
    ],
  },
  {
    title: "3. Prohibited Conduct",
    body: "You may not use RepayStream for illegal purposes, fraud, or to collect amounts you are not entitled to.",
  },
  {
    title: "4. Limitation of Liability",
    body: "RepayStream is not liable for failed payments, disputes between parties, or any losses arising from the use of the platform.",
  },
  {
    title: "5. Termination",
    body: "We reserve the right to suspend or terminate access for violation of these terms.",
  },
  {
    title: "6. Governing Law",
    body: "These terms are governed by the laws of the Federal Republic of Nigeria.",
  },
];

export function TermsPage() {
  return (
    <Layout maxWidth="2xl" showBack backTo="/" backLabel="Home">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        <motion.div variants={staggerItem} transition={smooth}>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">Terms of Use</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: May 9, 2026</p>
        </motion.div>

        <motion.div variants={fadeInUp} transition={smooth} className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground space-y-2">
          <p>Welcome to RepayStream.</p>
          <p>
            RepayStream is a non-custodial repayment orchestration platform. We help businesses create and manage
            repayment schedules while customers authorize payments through licensed Nigerian payment service providers.
          </p>
          <p className="font-semibold text-foreground">Important:</p>
          <p>
            We do not lend money, hold customer funds, issue credit, or act as a debt collector. All actual payments
            are processed directly by licensed payment service providers.
          </p>
          <p>By using RepayStream, you agree to these Terms of Use.</p>
        </motion.div>

        <div className="flex flex-col gap-5">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ ...smooth, delay: i * 0.04 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h2 className="mb-3 text-base font-bold text-foreground">{s.title}</h2>
              {s.body && <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>}
              {s.items && (
                <ul className="space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Layout>
  );
}
