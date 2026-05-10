import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Layout } from "@/components/Layout";
import { staggerContainer, staggerItem, fadeInUp, smooth } from "@/lib/motion";

const whatWeDont = [
  "We never hold customer funds.",
  "All payment processing and mandate management is handled exclusively by CBN-licensed Payment Service Providers.",
  "We act solely as an orchestration layer that captures consent and schedules authorized debits.",
];

const compliance = [
  "Central Bank of Nigeria (CBN) Direct Debit Scheme",
  "Nigeria Data Protection Regulation (NDPR)",
  "All applicable anti-money laundering and counter-terrorism financing laws",
];

export function CompliancePage() {
  return (
    <Layout maxWidth="2xl" showBack backTo="/" backLabel="Home">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        <motion.div variants={staggerItem} transition={smooth}>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">Compliance &amp; Regulatory Information</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: May 9, 2026</p>
        </motion.div>

        <motion.div variants={fadeInUp} transition={smooth} className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          RepayStream operates as a{" "}
          <span className="font-semibold text-foreground">non-custodial technology facilitation platform</span>. We do
          not perform regulated financial activities such as lending, deposit-taking, or funds custody.
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={smooth}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="mb-4 text-base font-bold text-foreground">What we do not do</h2>
          <ul className="space-y-2">
            {whatWeDont.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ ...smooth, delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="mb-4 text-base font-bold text-foreground">RepayStream is committed to compliance with:</h2>
          <ul className="space-y-2">
            {compliance.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ ...smooth, delay: 0.1 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-1"
        >
          <h2 className="text-base font-bold text-foreground">Company Registration</h2>
          <p className="text-sm text-muted-foreground">
            RepayStream is a product of{" "}
            <span className="font-semibold text-foreground">RepayStream Technologies Limited</span>.
          </p>
          <p className="text-sm text-muted-foreground">Corporate Affairs Commission (CAC) Registration Number: <span className="font-mono font-semibold text-foreground">9344129</span></p>
          <p className="text-sm text-muted-foreground">
            For regulatory inquiries, contact{" "}
            <a href="mailto:hello@repaystream.com" className="text-primary underline underline-offset-2">
              hello@repaystream.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
