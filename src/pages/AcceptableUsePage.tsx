import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { staggerContainer, staggerItem, fadeInUp, smooth } from "@/lib/motion";

const prohibited = [
  "Use the platform for illegal activities, fraud, or money laundering",
  "Create repayment plans for amounts you do not have a legitimate right to collect",
  "Provide false or misleading information",
  "Attempt to bypass or abuse our security, retry logic, or mandate flows",
  "Harass or intimidate other users",
  "Share your account credentials with unauthorized persons",
];

const reserved = [
  "Suspend or terminate your account if you violate this policy",
  "Report suspicious activity to relevant authorities when required by law",
];

export function AcceptableUsePage() {
  return (
    <Layout maxWidth="2xl" showBack backTo="/" backLabel="Home">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        <motion.div variants={staggerItem} transition={smooth}>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">Acceptable Use Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: May 9, 2026</p>
        </motion.div>

        <motion.p variants={fadeInUp} transition={smooth} className="text-sm leading-relaxed text-muted-foreground rounded-2xl border border-border bg-card p-6">
          By using RepayStream, you agree to the following rules:
        </motion.p>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={smooth}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="mb-4 text-base font-bold text-foreground">You may not:</h2>
          <ul className="space-y-2">
            {prohibited.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
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
          <h2 className="mb-4 text-base font-bold text-foreground">We reserve the right to:</h2>
          <ul className="space-y-2">
            {reserved.map((item) => (
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
          transition={{ ...smooth, delay: 0.1 }}
          className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6"
        >
          <p className="text-sm text-muted-foreground">
            If you observe any misuse, please report it to{" "}
            <a href="mailto:hello@repaystream.com" className="text-primary underline underline-offset-2">
              hello@repaystream.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
