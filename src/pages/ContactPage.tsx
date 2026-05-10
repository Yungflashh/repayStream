import { motion } from "framer-motion";
import { Mail, Globe, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { staggerContainer, staggerItem, fadeInUp, smooth } from "@/lib/motion";

const contacts = [
  { icon: Mail,  label: "Email",           value: "hello@repaystream.com", href: "mailto:hello@repaystream.com" },
  { icon: Globe, label: "Website",         value: "www.repaystream.com",   href: "https://www.repaystream.com" },
  { icon: Clock, label: "Response time",   value: "Within 48 hours",       href: null },
];

export function ContactPage() {
  return (
    <Layout maxWidth="2xl" showBack backTo="/" backLabel="Home">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        <motion.div variants={staggerItem} transition={smooth}>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Support</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">Contact Us</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: May 9, 2026</p>
        </motion.div>

        <motion.p variants={fadeInUp} transition={smooth} className="text-sm leading-relaxed text-muted-foreground rounded-2xl border border-border bg-card p-6">
          For support, partnership, or regulatory questions, please reach out to us. We aim to respond within 48 hours.
        </motion.p>

        <div className="grid gap-4 sm:grid-cols-3">
          {contacts.map((c, i) => (
            <motion.div
              key={c.label}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ ...smooth, delay: i * 0.06 }}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                {c.href ? (
                  <a href={c.href} className="mt-1 block text-sm font-semibold text-primary underline underline-offset-2 break-all">
                    {c.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-foreground">{c.value}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Layout>
  );
}
