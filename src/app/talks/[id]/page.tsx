"use client";

import { useParams } from "next/navigation";
import { TalkAssistPanel } from "../../talk-assist";
import { TalkWorkspace } from "../../talk-workspace";
import styles from "../../page.module.css";

export default function TalkDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  if (!id) {
    return (
      <div className={styles.world}>
        <p className={styles.err}>找不到这条口播</p>
      </div>
    );
  }
  return (
    <div className={styles.world}>
      <div className={styles.layout}>
        <div className={styles.rail}>
          <TalkAssistPanel talkId={id} />
        </div>
        <div className={styles.talkFrame}>
          <TalkWorkspace talkId={id} />
        </div>
      </div>
    </div>
  );
}
