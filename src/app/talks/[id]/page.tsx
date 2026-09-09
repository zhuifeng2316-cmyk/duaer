"use client";

import { useParams } from "next/navigation";
import { TalkWorkspace } from "../../talk-workspace";
import styles from "../../page.module.css";

export default function TalkDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  return (
    <div className={styles.world}>
      <div className={styles.talkOnly}>
        {id ? <TalkWorkspace talkId={id} /> : <p className={styles.err}>找不到这条口播</p>}
      </div>
    </div>
  );
}
