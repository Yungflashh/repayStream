import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { staggerContainer, staggerItem, fadeInUp, smooth } from "@/lib/motion";

const collected = [
  "Business details (name, email, phone, business information)",
  "Customer information provided during plan creation (name, phone, email)",
  "Payment attempt records and status (we do not store card details)",
];

const usage = [
  "To create and manage repayment plans",
  "To facilitate secure authorization through licensed payment providers",
  "To send status updates and notifications",
  "To maintain audit logs for compliance purposes",
];

export function PrivacyPage() {
  return (
    <Layout maxWidth="2xl" showBack backTo="/" backLabel="Home">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        <motion.div variants={staggerItem} transition={smooth}>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: May 9, 2026</p>
        </motion.div>

        <motion.p variants={fadeInUp} transition={smooth} className="text-sm leading-relaxed text-muted-foreground rounded-2xl border border-border bg-card p-6">
          RepayStream respects your privacy and is committed to protecting your personal data.
        </motion.p>

        {[
          { title: "Information We Collect", items: collected },
          { title: "How We Use Your Information", items: usage },
        ].map((section, i) => (
          <motion.div
            key={section.title}
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ ...smooth, delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <h2 className="mb-4 text-base font-bold text-foreground">{section.title}</h2>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ ...smooth, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div>
            <h2 className="mb-2 text-base font-bold text-foreground">Data Sharing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We only share data with licensed Payment Service Providers (e.g., Paystack) strictly for processing
              authorized payments and as required by law. We do not sell your data.
            </p>
          </div>
          <div>
            <h2 className="mb-2 text-base font-bold text-foreground">Your Rights</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You have the right to access, correct, or request deletion of your personal data. Contact us at{" "}
              <a href="mailto:hello@repaystream.com" className="text-primary underline underline-offset-2">
                hello@repaystream.com
              </a>{" "}
              to exercise these rights.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
