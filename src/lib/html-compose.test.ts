import { describe, expect, it } from "vitest";
import { needsCinemaHostGrade } from "./cinema";
import { MOCK_SCRIPT } from "./copy";
import { houseCatalog } from "./duaer-registry";
import {
  LAST_SHOT_HOLD_SEC,
  buildCaptionTrack,
  buildEditList,
  buildHtmlSystem,
  buildPosterCards,
  buildShotCaptions,
  buildSlamPhrases,
  extractHtmlDocument,
  cinemaTypeScale,
  fallbackCinemaHtml,
  generateCinemaHtml,
  htmlClipToStillRel,
  parseCompositionClips,
  captionGraphicCarriesTalkCopy,
  graphicHoldsLettering,
  isCaptionGraphic,
  letteringStyleFromGraphic,
  parseHighlightList,
  shotHighlightList,
  pickShotCaptionStyle,
  planShotLettering,
  splitCaptionPhrases,
  splitCaptionSentences,
  stillBakesLettering,
  tokenizeCaption,
  validateCinemaHtml,
} from "./html-compose";

describe("cinema html compose", () => {
  const list = buildEditList({
    script: MOCK_SCRIPT,
    stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
    aspect: "9:16",
    speechRel: "speech.wav",
    bgmRel: "bgm.mp3",
  });

  it("builds an edit list that covers every shot", () => {
    expect(list.width).toBe(1440);
    expect(list.height).toBe(2560);
    expect(list.clips).toHaveLength(MOCK_SCRIPT.shots.length);
    expect(list.clips[0]?.stillRel).toBe("stills/shot-1.png");
    expect(list.speechRel).toBe("speech.wav");
    const lastShot = MOCK_SCRIPT.shots[MOCK_SCRIPT.shots.length - 1]!;
    const lastClip = list.clips[list.clips.length - 1]!;
    expect(lastClip.speechDuration).toBe(lastShot.durationSec);
    expect(lastClip.duration).toBe(lastShot.durationSec + LAST_SHOT_HOLD_SEC);
    expect(list.durationSec).toBeCloseTo(list.speechDurationSec + LAST_SHOT_HOLD_SEC, 5);
    expect(list.clips[0]?.spokenText).toContain(MOCK_SCRIPT.hook);
    expect(list.clips[list.clips.length - 1]?.spokenText).toContain(MOCK_SCRIPT.cta);
  });

  it("fallback html is a valid cinema composition", () => {
    const html = fallbackCinemaHtml(list);
    expect(validateCinemaHtml(html, list)).toEqual({ ok: true });
    expect(html).toMatch(/data-composition-id="cinema"/);
    expect(html).toContain('src="stills/shot-1.png"');
    expect(html).not.toContain("../stills");
    expect(html).toContain("speech.wav");
    expect(html).toContain("bgm.mp3");
    expect(html).toMatch(/data-motion="push-in"/);
    expect(html).toContain("data-color-grading=");
    expect(html).toContain('data-caption-overlay="film"');
    expect(html).toMatch(/\.still \{\s*width: 100%; height: 100%/);
    expect(html).toMatch(/"grain"/);
    expect(html).toMatch(/"vignette"/);
    expect(html).toMatch(/gsap\.timeline\(\s*\{\s*paused:\s*true/);
    expect(html).toContain('window.__timelines["cinema"]');
    expect(html).toMatch(/className = "poster-title"/);
    expect(html).toMatch(/className = "kt-word"/);
    expect(html).toMatch(/className = "ed-block"/);
    expect(html).toMatch(/className = "wp-group"/);
    expect(html).toContain("wordsByPhrase");
    expect(html).toMatch(/className = "wt-group"/);
    expect(html).toMatch(/data-caption-style="slam"/);
    expect(html).toMatch(/data-caption-style="editorial"/);
    expect(html).toMatch(/data-caption-style="wipe"/);
    expect(html).toMatch(/data-caption-style="weight"/);
    expect(html).toMatch(/data-layout="hero"/);
    expect(html).toMatch(/data-layout="under-text"/);
    expect(html).toMatch(/data-layout="split"/);
    expect(html).toMatch(/data-layout="reuse"/);
    expect(html).toMatch(/data-layout="montage"/);
    expect(html).toContain("still-stack");
    expect(html).toContain("is-dim");
    expect(html).toContain("is-layer");
    expect(html).not.toMatch(/hl-group/);
    expect(html).not.toMatch(/hl-word-bg/);
    expect(html).toContain("id=\"vo\"");
    expect(html).toContain("id=\"bgm\"");
    expect(html).toContain('data-volume="1"');
    expect(html).toContain('data-volume="0.16"');
    expect(html).not.toContain("data-no-timeline");
    expect(html).not.toMatch(/@keyframes ken-push/);
    expect(html).toContain("temperature");
    expect(html).toContain("cdn.jsdelivr.net/npm/gsap@3.14.2");
    expect(html).toContain(`id="vo" data-start="0" data-duration="${list.speechDurationSec.toFixed(2)}"`);
    expect(html).toContain(`data-composition-id="cinema" data-start="0" data-duration="${list.durationSec.toFixed(2)}"`);
    const spokenJoin = buildShotCaptions(list)
      .map((s) => s.words.map((w) => w.text).join(""))
      .join("");
    expect(spokenJoin).toContain("你不用出镜");
    expect(spokenJoin).toContain("照片和声音都交给克隆");
  });

  it("rejects a draft that skips the cinema look", () => {
    const html = fallbackCinemaHtml(list).replace(/data-color-grading='[^']*'/g, "");
    expect(validateCinemaHtml(html, list).ok).toBe(false);
  });

  it("rejects html that drops a still or uses a remote url", () => {
    const html = fallbackCinemaHtml(list).replaceAll("shot-3.png", "missing.png");
    expect(validateCinemaHtml(html, list).ok).toBe(false);
    expect(validateCinemaHtml(html.replaceAll("missing.png", "shot-3.png") + `<img src="https://evil.example/x.png">`, list).ok).toBe(false);
  });

  it("parses clip timing from the html", () => {
    const clips = parseCompositionClips(fallbackCinemaHtml(list));
    expect(clips.length).toBe(MOCK_SCRIPT.shots.length);
    expect(htmlClipToStillRel(clips[0]!.src)).toBe("stills/shot-1.png");
    expect(clips[0]?.duration).toBe(MOCK_SCRIPT.shots[0]?.durationSec);
  });

  it("strips markdown fences from a model reply", () => {
    const inner = fallbackCinemaHtml(list);
    expect(extractHtmlDocument("```html\n" + inner + "\n```")).toContain("data-composition-id");
  });

  it("mock generateCinemaHtml returns the fallback", async () => {
    const prev = process.env.FLOW_MOCK;
    process.env.FLOW_MOCK = "1";
    const html = await generateCinemaHtml(list);
    process.env.FLOW_MOCK = prev;
    expect(validateCinemaHtml(html, list).ok).toBe(true);
  });

  it("tells the writer how to make a cinema cut", () => {
    const system = buildHtmlSystem();
    expect(system).toMatch(/胶片/);
    expect(system).toMatch(/词级/);
    expect(system).toMatch(/暂停/);
    expect(system).toMatch(/字盖在画面上/);
    expect(system).toMatch(/对嘴型/);
    expect(system).not.toMatch(/HyperFrames|HeyGen|方舟|豆包/i);
  });

  it("splits spoken lines into caption words", () => {
    expect(tokenizeCaption("还在找人拍口播出镜吗")).toEqual([...("还在找人拍口播出镜吗")]);
    expect(tokenizeCaption("今天，为自己做一件小事。")).toEqual([..."今天为自己做一件小事"]);
    expect(tokenizeCaption("三笔账：时间、钱、风险")).toEqual([..."三笔账时间钱风险"]);
    expect(parseHighlightList("三笔账：时间、钱、风险")).toEqual({ title: "三笔账", items: ["时间", "钱", "风险"] });
    expect(parseHighlightList("三笔账：时间 钱 风险")).toEqual({ title: "三笔账", items: ["时间", "钱", "风险"] });
    expect(parseHighlightList("如果由我，未必更好")).toBeUndefined();
    expect(parseHighlightList("结论：如果由我，未必更好")).toBeUndefined();
    expect(shotHighlightList("三笔账", "时间、钱、风险，这三笔账都得算")).toEqual({
      title: "三笔账",
      items: ["时间", "钱", "风险"],
    });
    expect(splitCaptionSentences("今天，为自己做一件小事。")).toEqual(["今天", "为自己做一件小事"]);
    expect(splitCaptionPhrases("下次想说「如果由我」，先把代价列出来。")).toEqual(["下次想说", "如果由我", "先把代价列出来"]);
    expect(splitCaptionPhrases("下次想说如果由我先把代价列出来")).toEqual(["下次想说", "如果由我", "先把代价列出来"]);
    expect(splitCaptionPhrases("如果由我，未必更好")).toEqual(["如果由我", "未必更好"]);
    expect(parseHighlightList("眼前快乐＞花钱代价")).toEqual({ title: "", items: ["眼前快乐", "花钱代价"] });
    expect(planShotLettering({ ...list.clips[0]!, lettering: "overlay-highlight", onScreenText: "眼前快乐＞花钱代价" }, 2, 4).style).toBe(
      "highlight",
    );
    const track = buildCaptionTrack(list);
    expect(track.words.length).toBeGreaterThan(8);
    expect(track.groups.length).toBeGreaterThan(2);
    expect(track.words.map((w) => w.text).join("")).toContain("口播");
    expect(track.words.some((w) => /[，。！？、：；,.!?;:]/.test(w.text))).toBe(false);
    const posters = buildPosterCards(list);
    expect(posters[0]?.text.replace(/\n/g, "")).toContain("还在自己拍口播");
    expect(posters.some((p) => /[，。！？、：；,.!?;:]/.test(p.text))).toBe(false);
    const slams = buildSlamPhrases(list);
    expect(slams.length).toBeGreaterThan(8);
    expect(slams.map((w) => w.text).join("")).toContain("口播");
    expect(slams.some((w) => w.accent)).toBe(true);
    expect(slams.some((w) => /[，。！？、：；,.!?;:]/.test(w.text))).toBe(false);
  });

  it("pages a long spoken line onto short caption screens", () => {
    const talk = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 1
            ? {
                ...shot,
                lettering: "overlay-wipe" as const,
                onScreenText: "先列代价",
                voiceover: "下次想说「如果由我」，先把代价列出来。",
              }
            : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const row = buildShotCaptions(talk)[1]!;
    expect(row.style).toBe("wipe");
    expect(row.words.map((w) => w.text).join("")).toBe("下次想说如果由我先把代价列出来");
    const phrases = [...new Set(row.words.map((w) => w.phrase))];
    expect(phrases.length).toBeGreaterThanOrEqual(3);
    expect(row.words.filter((w) => w.phrase === 0).map((w) => w.text).join("")).toBe("下次想说");
    const html = fallbackCinemaHtml(talk);
    expect(html).toContain('"phrase":0');
    expect(html).toContain('"phrase":1');
    expect(html).toContain('"phrase":2');
    expect(html).toContain("wordsByPhrase");
  });

  it("pages editorial and weight captions instead of packing the whole line", () => {
    const talk = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 1
            ? {
                ...shot,
                captionStyle: "caption-editorial-emphasis",
                voiceover: "下次想说「如果由我」，先把代价列出来。",
                onScreenText: "先列代价",
              }
            : i === 2
              ? {
                  ...shot,
                  captionStyle: "caption-weight-shift",
                  voiceover: "旁观容易只看结果，做决定却得扛代价。",
                  onScreenText: "看见代价",
                }
              : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const captions = buildShotCaptions(talk);
    expect(captions[1]?.style).toBe("editorial");
    expect(captions[1]?.words.filter((w) => w.phrase === 0).map((w) => w.text).join("")).toBe("下次想说");
    expect(new Set(captions[1]?.words.map((w) => w.phrase)).size).toBeGreaterThanOrEqual(3);
    expect(captions[2]?.style).toBe("weight");
    expect(new Set(captions[2]?.words.map((w) => w.phrase)).size).toBeGreaterThanOrEqual(2);
    const html = fallbackCinemaHtml(talk);
    expect(html).toContain('"style":"editorial"');
    expect(html).toContain('"style":"weight"');
    expect(html).toContain('id = "ed-" + prefix + "-" + pi');
    expect(html).toContain('id = "wt-" + prefix + "-" + pi');
  });

  it("picks a different caption identity per storyboard shot", () => {
    const styles = list.clips.map((clip, i) => pickShotCaptionStyle(clip, i, list.clips.length));
    expect(new Set(styles).size).toBeGreaterThanOrEqual(3);
    expect(styles).toContain("editorial");
    expect(styles).toContain("wipe");
    expect(styles).toContain("slam");
    const shots = buildShotCaptions(list);
    expect(shots.map((s) => s.style)).toEqual(styles);
    expect(list.clips[0]?.scene).toBe("窗边特写");
  });

  it("keeps only one lettering layer and does not overlap words", () => {
    expect(isCaptionGraphic("caption-kinetic-slam")).toBe(true);
    expect(isCaptionGraphic("carousel-circle-1")).toBe(false);
    const slam = planShotLettering({ ...list.clips[0]!, motion: "punch", layout: "hero" }, 0, 5);
    expect(slam.style).toBe("slam");
    expect(slam.showPoster).toBe(false);
    expect(slam.showSpoken).toBe(true);
    const captionDemo = planShotLettering(
      { ...list.clips[0]!, overlay: "caption-kinetic-slam", block: undefined, motion: "push-in" },
      0,
      5,
    );
    expect(captionGraphicCarriesTalkCopy("caption-kinetic-slam")).toBe(false);
    expect(letteringStyleFromGraphic("caption-kinetic-slam")).toBe("slam");
    expect(captionDemo.showPoster).toBe(false);
    expect(captionDemo.showSpoken).toBe(true);
    const emptyGraphicLettering = planShotLettering(
      {
        ...list.clips[0]!,
        overlay: "caption-kinetic-slam",
        block: undefined,
        motion: "push-in",
        graphicVars: {},
        lettering: "graphic",
      },
      0,
      5,
    );
    expect(emptyGraphicLettering.showSpoken).toBe(true);
    expect(emptyGraphicLettering.showPoster).toBe(false);
    expect(emptyGraphicLettering.style).toBe("slam");
    const captionFilled = planShotLettering(
      {
        ...list.clips[0]!,
        overlay: "typewriter",
        block: undefined,
        motion: "push-in",
        graphicVars: { text: list.clips[0]!.onScreenText },
      },
      0,
      5,
    );
    expect(captionGraphicCarriesTalkCopy("typewriter", { text: list.clips[0]!.onScreenText })).toBe(true);
    expect(captionFilled.showPoster).toBe(false);
    expect(captionFilled.showSpoken).toBe(false);
    expect(graphicHoldsLettering("notification-stack", { titles: "刷新一下" })).toBe(true);
    expect(graphicHoldsLettering("data-chart")).toBe(true);
    const notify = planShotLettering(
      { ...list.clips[0]!, overlay: "native-notification-pop", motion: "push-in", layout: "hero" },
      0,
      5,
    );
    expect(notify.pose).toBe("top-left");
    expect(notify.showPoster).toBe(false);
    expect(notify.showSpoken).toBe(false);
    const same = planShotLettering(
      { ...list.clips[0]!, onScreenText: "刷新一下", voiceover: "刷新一下就好", motion: "push-in", layout: "hero" },
      1,
      5,
    );
    expect(same.showPoster).toBe(false);
    const shots = buildShotCaptions(list);
    for (const shot of shots) {
      for (let i = 1; i < shot.words.length; i++) {
        expect(shot.words[i - 1]!.end).toBeLessThanOrEqual(shot.words[i]!.start);
      }
      const cut = shot.start + shot.duration - 0.05;
      expect(shot.words.every((w) => w.end <= cut)).toBe(true);
    }
    const posters = buildPosterCards(list);
    const slamIds = new Set(shots.filter((s) => s.style === "slam").map((s) => s.clipId));
    expect(posters.some((p) => slamIds.has(p.id))).toBe(false);
    expect(posters.every((p) => p.pose === "top-left" || p.pose === "top-right")).toBe(true);
  });

  it("embeds allowlisted graphics as a card or overlay", () => {
    const graphicScript = {
      ...MOCK_SCRIPT,
      visualMode: "product" as const,
      shots: MOCK_SCRIPT.shots.map((shot, i) =>
        i === 0
          ? { ...shot, overlay: "notification-stack" }
          : i === 1
            ? { ...shot, block: "data-chart" }
            : shot,
      ),
    };
    const graphicList = buildEditList({
      script: graphicScript,
      stillRels: graphicScript.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const html = fallbackCinemaHtml({
      ...graphicList,
      clips: graphicList.clips.map((c, i) =>
        i === 0 ? { ...c, overlay: "pull-to-refresh", graphicVars: { pullDistance: 160, spinnerStyle: "ring" } } : c,
      ),
    });
    expect(html).toContain('data-registry="pull-to-refresh"');
    expect(html).toContain('data-composition-src="compositions/pull-to-refresh--shot-1.html"');
    expect(html).toContain("data-variable-values");
    expect(html).toContain("pullDistance");
    expect(html).toContain('data-registry="data-chart"');
    expect(html).toContain('data-composition-src="compositions/data-chart--shot-2.html"');
    expect(html).toContain('data-composition-id="data-chart--shot-2"');
    expect(html).toContain("registry-adapt");
    expect(html).toContain("registry-overlay");
    expect(html).toContain(`--brand:${"#e8c56a"}`);
    expect(html).toContain(`--accent:${"#d4a05a"}`);
    expect(html).toMatch(/class="[^"]*registry-grade[^"]*"[^>]*data-registry="data-chart"/);
    expect(html).toMatch(/data-registry="data-chart"[^>]*data-color-grading=/);
    const uploaded = fallbackCinemaHtml({
      ...graphicList,
      clips: graphicList.clips.map((c, i) => (i === 1 ? { ...c, graphicUploads: ["image1"] } : c)),
    });
    expect(uploaded).not.toMatch(/data-registry="data-chart"[^>]*data-color-grading=/);
    expect(uploaded).not.toMatch(/class="[^"]*registry-grade[^"]*"[^>]*data-registry="data-chart"/);
    expect(html).toContain("--adapt-scale:");
    expect(html).not.toContain('class="registry-card"');
    expect(html).not.toContain('data-width="960"');
    expect(html).not.toContain('data-height="540"');
    expect(html).toContain('data-width="1920"');
    expect(html).toContain('data-height="1080"');
    expect(html).toContain('data-width="1440"');
    expect(html).toContain('data-height="2560"');
    expect(validateCinemaHtml(html, graphicList)).toEqual({ ok: true });
    expect(cinemaTypeScale(1440).poster).toBeGreaterThan(cinemaTypeScale(1080).poster);
    const flowHtml = fallbackCinemaHtml({
      ...graphicList,
      clips: graphicList.clips.map((c, i) => (i === 1 ? { ...c, block: "flowchart-vertical", overlay: undefined } : c)),
    });
    expect(flowHtml).toContain('data-registry="flowchart-vertical"');
    expect(flowHtml).toContain("flowchart-vertical--shot-2");
    expect(flowHtml).toContain('data-width="1440"');
    expect(flowHtml).toContain('data-height="2560"');
    expect(flowHtml).toContain("registry-adapt");
    const dirty = fallbackCinemaHtml({
      ...graphicList,
      clips: graphicList.clips.map((c, i) => (i === 1 ? { ...c, block: "not-a-real-widget", overlay: undefined } : c)),
    });
    expect(dirty).not.toContain("not-a-real-widget");
    const rematch = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        visualMode: "product",
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 0
            ? { ...shot, graphicIntent: "下拉刷新", block: "transitions-other", overlay: undefined }
            : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    expect(rematch.clips[0]?.block).toBeUndefined();
    expect(rematch.clips[0]?.overlay).toBe("pull-to-refresh");
  });

  it("sizes type for an in-feed vertical cut", () => {
    const type = cinemaTypeScale(list.width);
    expect(type.poster).toBeGreaterThanOrEqual(110);
    expect(type.slam).toBeGreaterThanOrEqual(200);
    expect(type.editorial).toBeGreaterThanOrEqual(110);
    expect(type.wipe).toBeGreaterThanOrEqual(110);
    expect(type.weight).toBeGreaterThanOrEqual(110);
    expect(cinemaTypeScale(2160).poster).toBeGreaterThan(type.poster);
    const html = fallbackCinemaHtml(list);
    expect(html).toContain(`var posterBase = ${type.poster}`);
    expect(html).toContain(`var slamBase = ${type.slam}`);
    expect(html).toContain("lineFitSize");
    expect(html).toContain("国国国国国国国国");
    expect(html).not.toContain("baseFontSize * 0.45");
  });

  it("omits a clone still when the shot is a component host", () => {
    const hostList = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 0 ? { ...shot, block: "carousel-circle-1", hostStill: false } : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    expect(hostList.clips[0]?.stillRel).toBe("");
    const html = fallbackCinemaHtml(hostList);
    expect(html).toContain("still-empty");
    expect(html).toContain('data-registry="carousel-circle-1"');
    expect(html).toMatch(/class="[^"]*registry-grade[^"]*"[^>]*data-registry="carousel-circle-1"/);
    // 9:16 cover-scales 1920×1080 hosts (max of w/h ratios), not letterbox contain.
    expect(html).toMatch(/data-registry="carousel-circle-1"[^>]*--adapt-scale:2\.37/);
    expect(html).not.toMatch(/data-registry="carousel-circle-1"[^>]*--adapt-scale:0\.75/);
  });

  it("does not mount caption demos; keeps this talk's words", () => {
    const demoList = {
      ...list,
      clips: list.clips.map((c, i) =>
        i === 0 ? { ...c, overlay: "caption-highlight", block: undefined, graphicVars: undefined } : c,
      ),
    };
    const html = fallbackCinemaHtml(demoList);
    expect(html).not.toContain('data-registry="caption-highlight"');
    const spoken = buildShotCaptions(demoList).find((s) => s.clipId === "shot-1");
    const spokenJoin = spoken?.words.map((w) => w.text).join("") || "";
    expect(spokenJoin).toContain("你不用出镜");
    expect(spokenJoin).toContain("还在找人拍口播出镜");
    expect(html).toContain(JSON.stringify(spoken?.words[0]));
    expect(html).not.toMatch(/HyperFrames/i);
    const filled = fallbackCinemaHtml({
      ...list,
      clips: list.clips.map((c, i) =>
        i === 0
          ? { ...c, overlay: "typewriter", block: undefined, graphicVars: { text: c.onScreenText } }
          : c,
      ),
    });
    expect(filled).toContain('data-registry="typewriter"');
    expect(filled).toContain("还在自己拍口播");
    expect(filled).not.toContain("还在自己拍口播？");
  });

  it("does not overlay a second poster title when the still already has a short one", () => {
    expect(stillBakesLettering(MOCK_SCRIPT.shots[0]!)).toBe(true);
    expect(stillBakesLettering({ ...MOCK_SCRIPT.shots[0]!, block: "data-chart", overlay: undefined })).toBe(false);
    expect(stillBakesLettering({ ...MOCK_SCRIPT.shots[0]!, hostStill: false, block: "carousel-circle-1" })).toBe(false);
    const bakedList = {
      ...list,
      clips: list.clips.map((c, i) => (i === 1 ? { ...c, letteringInStill: true, layout: "under-text" as const } : c)),
    };
    const plan = planShotLettering(bakedList.clips[1]!, 1, bakedList.clips.length);
    expect(plan.showPoster).toBe(false);
    expect(plan.showSpoken).toBe(true);
    expect(plan.style).not.toBe("slam");
    const html = fallbackCinemaHtml(bakedList);
    expect(html).not.toMatch(/id="shot-2-still"[^>]*is-dim/);
    const spoken = buildShotCaptions(bakedList).find((s) => s.clipId === "shot-2");
    expect((spoken?.words || []).length).toBeGreaterThan(0);
    expect(buildPosterCards(bakedList).some((p) => p.id === "shot-2")).toBe(false);
  });

  it("paints every house component with the cinema skin", () => {
    for (const item of houseCatalog()) {
      const html = fallbackCinemaHtml({
        ...list,
        clips: list.clips.map((c, i) =>
          i === 0
            ? {
                ...c,
                block: item.host ? item.wraps : undefined,
                overlay: item.host ? undefined : item.wraps,
              }
            : c,
        ),
      });
      if (isCaptionGraphic(item.wraps) && !captionGraphicCarriesTalkCopy(item.wraps)) {
        expect(html).not.toContain(`data-registry="${item.wraps}"`);
        continue;
      }
      expect(html).toContain(`data-registry="${item.wraps}"`);
      expect(html).toContain("--accent:#d4a05a");
      expect(html).toContain("--brand:#e8c56a");
      expect(html).toContain("--background:#0c0a08");
      if (needsCinemaHostGrade(item.wraps)) {
        expect(html).toMatch(new RegExp(`class="[^"]*registry-grade[^"]*"[^>]*data-registry="${item.wraps}"`));
      } else {
        expect(html).not.toMatch(new RegExp(`class="[^"]*registry-grade[^"]*"[^>]*data-registry="${item.wraps}"`));
      }
    }
  });

  it("keeps spoken captions when a caption overlay has no talk copy, and strips titlecard punctuation", () => {
    const talk = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        visualMode: "story",
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 0
            ? { ...shot, overlay: "caption-kinetic-slam", graphicVars: {}, lettering: "graphic" as const }
            : i === 2
              ? {
                  ...shot,
                  overlay: "titlecard-calm",
                  kind: "empty",
                  imagePrompt: "",
                  onScreenText: "三笔账：时间、钱、风险",
                  graphicVars: { headline: "三笔账：时间、钱、风险", kicker: "DESIGN PRINCIPLE" },
                  lettering: "graphic" as const,
                }
              : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const captions = buildShotCaptions(talk);
    expect(captions[0]?.words.length).toBeGreaterThan(0);
    expect(captions[0]?.words.some((w) => /[，。、：,]/.test(w.text))).toBe(false);
    expect(captions[2]?.style).toBe("highlight");
    expect(captions[2]?.title).toBe("三笔账");
    expect(captions[2]?.words.map((w) => w.text)).toEqual(["时间", "钱", "风险"]);
    const clip = talk.clips[2]!;
    const speech = clip.speechDuration || clip.duration;
    expect(captions[2]!.words.at(-1)!.start).toBeLessThan(clip.start + speech * 0.75);
    const html = fallbackCinemaHtml(talk);
    expect(html).not.toContain("caption-kinetic-slam");
    expect(html).not.toContain("titlecard-calm");
    expect(html).toContain("三笔账");
    expect(html).toContain("时间");
    expect(html).toContain("playHighlight");
    expect(html).toContain("max-width: 42%");
    expect(html).toContain("railFitSize");
    expect(html).toContain("is-on");
    expect(html).not.toContain("DESIGN PRINCIPLE");
    expect(html).not.toMatch(/三笔账[：:]/);
    expect(html).not.toContain("时间、钱");
  });

  it("does not mount a filled caption overlay when the shot is a highlight list", () => {
    const talk = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        visualMode: "story",
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 2
            ? {
                ...shot,
                overlay: "caption-highlight",
                onScreenText: "三笔账：时间、钱、风险",
                graphicVars: { text: "三笔账：时间、钱、风险" },
                lettering: "graphic" as const,
              }
            : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const captions = buildShotCaptions(talk);
    expect(captions[2]?.style).toBe("highlight");
    expect(captions[2]?.words.map((w) => w.text)).toEqual(["时间", "钱", "风险"]);
    const html = fallbackCinemaHtml(talk);
    expect(html).not.toContain('data-registry="caption-highlight"');
  });

  it("slams the knowledge hook and keeps captions over the full frame", () => {
    const knowledge = buildEditList({
      script: { ...MOCK_SCRIPT, visualMode: "knowledge" },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    expect(knowledge.visualMode).toBe("knowledge");
    expect(planShotLettering(knowledge.clips[0]!, 0, knowledge.clips.length, "knowledge").style).toBe("slam");
    const html = fallbackCinemaHtml(knowledge);
    expect(html).toContain('data-caption-overlay="film"');
    expect(html).toMatch(/\.still \{\s*width: 100%; height: 100%/);
    expect(validateCinemaHtml(html, knowledge)).toEqual({ ok: true });
  });

  it("aligns opposing camera moves on the edit list", () => {
    const moved = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        shots: MOCK_SCRIPT.shots.map((shot, i) =>
          i === 0 ? { ...shot, motion: "pan-left" } : i === 1 ? { ...shot, motion: "pan-right" } : shot,
        ),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    expect(moved.clips[0]?.motion).toBe("pan-left");
    expect(moved.clips[1]?.motion).toBe("pan-left");
  });

  it("builds a 4K edit list when asked", () => {
    const fourK = buildEditList({
      script: MOCK_SCRIPT,
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
      quality: "4K",
    });
    expect(fourK.width).toBe(2160);
    expect(fourK.height).toBe(3840);
  });

  it("applies a global caption skin and a per-shot override", () => {
    const neon = buildEditList({
      script: MOCK_SCRIPT,
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
      captionStyle: "caption-neon-glow",
    });
    const skins = buildShotCaptions(neon);
    expect(skins.every((row) => row.skin === "caption-neon-glow")).toBe(true);
    expect(skins.every((row) => row.style === "slam")).toBe(true);
    const html = fallbackCinemaHtml(neon);
    expect(html).toContain('data-caption-skin="caption-neon-glow"');
    expect(html).toContain("cap-neon-glow");
    expect(html).toContain(".cap-kinetic-slam");
    expect(html).toContain(".cap-editorial-emphasis");
    expect(html).toContain(".cap-weight-shift");
    expect(html).toContain(".cap-highlight");
    expect(html).toContain(".cap-clip-wipe");
    expect(html).toContain(".cap-camera-follow");
    expect(html).toContain(".cap-glitch-rgb");
    expect(html).toContain(".cap-neon-accent");
    expect(html).toContain(".cap-blend-difference");
    expect(html).toContain(".cap-emoji-pop");
    expect(html).toContain(".cap-gradient-fill");
    expect(html).toContain(".cap-matrix-decode");
    expect(html).toContain(".cap-parallax-layers");
    expect(html).toContain(".cap-particle-burst");
    expect(html).toContain(".cap-pill-karaoke");
    expect(html).toContain(".cap-texture");
    expect(html).toContain(".cap-look-cream");
    expect(html).toContain(".cap-look-chalkboard");
    expect(html).toContain(".cap-look-graffiti");
    expect(html).toContain(".cap-fx-typewriter");
    expect(html).toContain(".cap-fx-shimmer");
    expect(html).toContain(".cap-frame-coral");
    expect(html).toContain(".cap-frame-biennale");
    expect(html).toContain(".cap-move-rgb");
    expect(html).toContain(".cap-move-sweep");
    expect(html).toContain(".cap-card-geom");
    expect(html).toContain(".cap-card-social");
    expect(html).toContain(".cap-pop-scramble");
    expect(html).toContain(".cap-pop-halftone");
    expect(html).toContain("capSkinGlow");
    expect(html).toContain("capSkinSweep");

    const mixed = buildEditList({
      script: {
        ...MOCK_SCRIPT,
        shots: MOCK_SCRIPT.shots.map((shot, i) => (i === 0 ? { ...shot, captionStyle: "caption-kinetic-slam" } : shot)),
      },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
      captionStyle: "caption-editorial-emphasis",
    });
    const rows = buildShotCaptions(mixed);
    expect(rows[0]?.skin).toBe("caption-kinetic-slam");
    expect(rows[0]?.style).toBe("slam");
    expect(rows[1]?.skin).toBe("caption-editorial-emphasis");
    expect(rows[1]?.style).toBe("editorial");
    expect(planShotLettering({ ...mixed.clips[0]!, lettering: "overlay-wipe" }, 0, mixed.clips.length, "story", mixed.captionStyle).style).toBe(
      "slam",
    );
    expect(planShotLettering({ ...mixed.clips[1]!, lettering: "overlay-slam" }, 1, mixed.clips.length, "story", mixed.captionStyle).style).toBe(
      "editorial",
    );
    expect(planShotLettering({ ...list.clips[0]!, captionStyle: "nope" }, 0, list.clips.length).skin).toBeUndefined();
  });
});
