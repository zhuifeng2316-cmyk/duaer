"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./site-nav.module.css";

export function SiteNav() {
  const path = usePathname() || "/";
  const making = path === "/";
  const mine = path === "/talks" || path.startsWith("/talks/");
  const plans = path === "/plans";
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/billing", { cache: "no-store" });
      const data = await res.json();
      if (cancelled || !res.ok) return;
      const n = Number(data.remaining);
      if (Number.isFinite(n)) setRemaining(n);
    }
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("duaer-billing", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("duaer-billing", onFocus);
    };
  }, [path]);

  return (
    <header className={styles.nav}>
      <Link className={styles.mark} href="/">
        Duaer
      </Link>
      <nav className={styles.links} aria-label="菜单">
        <Link className={making ? styles.on : styles.link} href="/">
          开始做
        </Link>
        <Link className={mine ? styles.on : styles.link} href="/talks">
          我的视频
        </Link>
        <Link className={plans ? styles.on : styles.link} href="/plans">
          {remaining == null ? "会员" : remaining <= 0 ? "开通会员" : `还能做 ${remaining} 次`}
        </Link>
      </nav>
    </header>
  );
}
