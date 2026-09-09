"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-nav.module.css";

export function SiteNav() {
  const path = usePathname() || "/";
  const making = path === "/";
  const mine = path === "/talks" || path.startsWith("/talks/");
  return (
    <header className={styles.nav}>
      <Link className={styles.mark} href="/">
        Duaer
      </Link>
      <nav className={styles.links} aria-label="站点">
        <Link className={making ? styles.on : styles.link} href="/">
          做口播
        </Link>
        <Link className={mine ? styles.on : styles.link} href="/talks">
          我的口播
        </Link>
      </nav>
    </header>
  );
}
