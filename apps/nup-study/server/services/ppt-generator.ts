import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pptxgen = require("pptxgenjs");

type PptxGenJS = InstanceType<typeof pptxgen>;

export interface LearningDifficulty {
  type: string;
  severity?: "leve" | "moderado" | "severo";
}

export interface SlideContent {
  type: "title" | "content" | "image" | "comparison" | "conclusion";
  title: string;
  bullets?: string[];
  text?: string;
  imageUrl?: string;
  leftColumn?: string[];
  rightColumn?: string[];
}

export interface PresentationConfig {
  title: string;
  subtitle?: string;
  author: string;
  slides: SlideContent[];
  theme?: "professional" | "vibrant" | "minimalist" | "academic";
  learningDifficulties?: LearningDifficulty[];
}

export interface AdaptiveStyles {
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  spacing: {
    lineSpacing: number;
    bulletIndent: number;
  };
}

export class PPTGenerator {
  private pres: PptxGenJS;

  constructor() {
    this.pres = new pptxgen();
    this.configureDefaults();
  }

  private configureDefaults() {
    this.pres.layout = "LAYOUT_16x9";
    this.pres.author = "NuP-Study";
    this.pres.company = "NuP Education";
    this.pres.revision = "1";
    this.pres.subject = "Material Didático";
  }

  getAdaptiveStyles(
    theme: PresentationConfig["theme"] = "professional",
    difficulties: LearningDifficulty[] = []
  ): AdaptiveStyles {
    const hasTDAH = difficulties.some((d) => d.type === "tdah");
    const hasDislexia = difficulties.some((d) => d.type === "dislexia");
    const hasDeficienciaVisual = difficulties.some((d) =>
      d.type.includes("visual")
    );

    let styles: AdaptiveStyles = {
      fontSize: {
        title: 32,
        subtitle: 20,
        body: 16,
      },
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        background: "#ffffff",
        text: "#1e293b",
      },
      spacing: {
        lineSpacing: 1.5,
        bulletIndent: 0.5,
      },
    };

    if (hasTDAH) {
      styles.colors.primary = "#f59e0b";
      styles.colors.secondary = "#10b981";
      styles.spacing.lineSpacing = 1.8;
    }

    if (hasDislexia) {
      styles.fontSize.title = 36;
      styles.fontSize.body = 18;
      styles.spacing.lineSpacing = 2.0;
    }

    if (hasDeficienciaVisual) {
      styles.fontSize.title = 44;
      styles.fontSize.subtitle = 28;
      styles.fontSize.body = 24;
      styles.colors.text = "#000000";
    }

    if (theme === "vibrant") {
      styles.colors.primary = "#7c3aed";
      styles.colors.secondary = "#ec4899";
      styles.colors.background = "#fef3c7";
    } else if (theme === "minimalist") {
      styles.colors.primary = "#000000";
      styles.colors.secondary = "#6b7280";
      styles.colors.background = "#ffffff";
    } else if (theme === "academic") {
      styles.colors.primary = "#1e40af";
      styles.colors.secondary = "#475569";
      styles.colors.background = "#f8fafc";
    }

    return styles;
  }

  async generate(config: PresentationConfig): Promise<Buffer> {
    const styles = this.getAdaptiveStyles(
      config.theme,
      config.learningDifficulties
    );

    this.pres.title = config.title;

    this.addTitleSlide(config, styles);

    for (const slideContent of config.slides) {
      switch (slideContent.type) {
        case "title":
          this.addSectionTitleSlide(slideContent, styles, config.author);
          break;
        case "content":
          this.addContentSlide(slideContent, styles, config.author);
          break;
        case "image":
          this.addImageSlide(slideContent, styles, config.author);
          break;
        case "comparison":
          this.addComparisonSlide(slideContent, styles, config.author);
          break;
        case "conclusion":
          this.addConclusionSlide(slideContent, styles, config.author);
          break;
      }
    }

    const buffer = (await this.pres.write({
      outputType: "nodebuffer",
      compression: true,
    })) as Buffer;

    return buffer;
  }

  private addTitleSlide(config: PresentationConfig, styles: AdaptiveStyles) {
    const slide = this.pres.addSlide();
    slide.background = { color: styles.colors.primary };

    slide.addText(config.title, {
      x: 0.5,
      y: 2.0,
      w: 9.0,
      h: 1.5,
      fontSize: styles.fontSize.title + 8,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });

    if (config.subtitle) {
      slide.addText(config.subtitle, {
        x: 0.5,
        y: 3.7,
        w: 9.0,
        h: 0.8,
        fontSize: styles.fontSize.subtitle,
        color: "FFFFFF",
        align: "center",
      });
    }

    slide.addText(`Por: ${config.author}`, {
      x: 0.5,
      y: 5.0,
      w: 9.0,
      h: 0.5,
      fontSize: 14,
      color: "FFFFFF",
      align: "center",
      italic: true,
    });
  }

  private addFooter(slide: any, author: string, styles: AdaptiveStyles) {
    slide.addText(`${author} | NuP-Study`, {
      x: 0.5,
      y: 5.3,
      w: 4.0,
      h: 0.3,
      fontSize: 10,
      color: styles.colors.secondary,
    });

    slide.addText("", {
      x: 5.5,
      y: 5.3,
      w: 4.0,
      h: 0.3,
      fontSize: 10,
      color: styles.colors.secondary,
      align: "right",
    });
  }

  private addSectionTitleSlide(
    content: SlideContent,
    styles: AdaptiveStyles,
    author: string
  ) {
    const slide = this.pres.addSlide();
    slide.background = { color: styles.colors.background };

    slide.addText(content.title, {
      x: 0.5,
      y: 2.5,
      w: 9.0,
      h: 1.5,
      fontSize: styles.fontSize.title,
      bold: true,
      color: styles.colors.primary,
      align: "center",
    });

    slide.addShape(this.pres.ShapeType.rect, {
      x: 4.0,
      y: 4.2,
      w: 2.0,
      h: 0.05,
      fill: { color: styles.colors.secondary },
    });

    this.addFooter(slide, author, styles);
  }

  private addContentSlide(content: SlideContent, styles: AdaptiveStyles, author: string) {
    const slide = this.pres.addSlide();
    slide.background = { color: styles.colors.background };

    slide.addText(content.title, {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.8,
      fontSize: styles.fontSize.title,
      bold: true,
      color: styles.colors.primary,
    });

    slide.addShape(this.pres.ShapeType.rect, {
      x: 0.5,
      y: 1.4,
      w: 9.0,
      h: 0.02,
      fill: { color: styles.colors.secondary },
    });

    if (content.bullets && content.bullets.length > 0) {
      const bulletTexts = content.bullets.map(text => ({ text, options: {} }));
      slide.addText(bulletTexts, {
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 3.2,
        fontSize: styles.fontSize.body,
        color: styles.colors.text,
        bullet: { type: "number", indent: styles.spacing.bulletIndent },
        lineSpacing: styles.spacing.lineSpacing * 14,
        valign: "top",
        wrap: true,
      });
    } else if (content.text) {
      slide.addText(content.text, {
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 3.2,
        fontSize: styles.fontSize.body,
        color: styles.colors.text,
        lineSpacing: styles.spacing.lineSpacing * 14,
        valign: "top",
        wrap: true,
      });
    }

    this.addFooter(slide, author, styles);
  }

  private addImageSlide(content: SlideContent, styles: AdaptiveStyles, author: string) {
    const slide = this.pres.addSlide();
    slide.background = { color: styles.colors.background };

    slide.addText(content.title, {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.8,
      fontSize: styles.fontSize.title,
      bold: true,
      color: styles.colors.primary,
    });

    if (content.imageUrl) {
      slide.addImage({
        path: content.imageUrl,
        x: 1.5,
        y: 1.8,
        w: 7.0,
        h: 3.5,
      });
    }

    if (content.text) {
      slide.addText(content.text, {
        x: 0.8,
        y: 5.5,
        w: 8.4,
        h: 0.5,
        fontSize: styles.fontSize.body - 2,
        color: styles.colors.secondary,
        align: "center",
        italic: true,
      });
    }

    this.addFooter(slide, author, styles);
  }

  private addComparisonSlide(content: SlideContent, styles: AdaptiveStyles, author: string) {
    const slide = this.pres.addSlide();
    slide.background = { color: styles.colors.background };

    slide.addText(content.title, {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.8,
      fontSize: styles.fontSize.title,
      bold: true,
      color: styles.colors.primary,
    });

    slide.addShape(this.pres.ShapeType.rect, {
      x: 5.0,
      y: 1.5,
      w: 0.02,
      h: 4.0,
      fill: { color: styles.colors.secondary },
    });

    if (content.leftColumn) {
      const leftTexts = content.leftColumn.map(text => ({ text, options: {} }));
      slide.addText(leftTexts, {
        x: 0.8,
        y: 1.8,
        w: 4.0,
        h: 3.5,
        fontSize: styles.fontSize.body,
        color: styles.colors.text,
        bullet: true,
        lineSpacing: styles.spacing.lineSpacing * 14,
      });
    }

    if (content.rightColumn) {
      const rightTexts = content.rightColumn.map(text => ({ text, options: {} }));
      slide.addText(rightTexts, {
        x: 5.2,
        y: 1.8,
        w: 4.0,
        h: 3.5,
        fontSize: styles.fontSize.body,
        color: styles.colors.text,
        bullet: true,
        lineSpacing: styles.spacing.lineSpacing * 14,
      });
    }

    this.addFooter(slide, author, styles);
  }

  private addConclusionSlide(content: SlideContent, styles: AdaptiveStyles, author: string) {
    const slide = this.pres.addSlide();
    slide.background = { color: styles.colors.primary };

    slide.addText(content.title, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 1.0,
      fontSize: styles.fontSize.title,
      bold: true,
      color: "FFFFFF",
      align: "center",
    });

    if (content.bullets && content.bullets.length > 0) {
      const bulletTexts = content.bullets.map(text => ({ text, options: {} }));
      slide.addText(bulletTexts, {
        x: 1.5,
        y: 3.0,
        w: 7.0,
        h: 2.5,
        fontSize: styles.fontSize.body,
        color: "FFFFFF",
        bullet: true,
        lineSpacing: styles.spacing.lineSpacing * 14,
      });
    }

    slide.addText(`${author} | NuP-Study`, {
      x: 0.5,
      y: 5.3,
      w: 4.0,
      h: 0.3,
      fontSize: 10,
      color: "FFFFFF",
    });
  }

}

export async function generatePresentationFromContent(
  title: string,
  content: string,
  author: string,
  options?: {
    theme?: PresentationConfig["theme"];
    difficulties?: LearningDifficulty[];
  }
): Promise<Buffer> {
  const lines = content.split("\n").filter((l) => l.trim());
  const slides: SlideContent[] = [];
  
  let currentSection: string | null = null;
  let currentContent: string[] = [];

  const MAX_BULLETS_PER_SLIDE = 6;
  const MAX_TITLE_LENGTH = 60;

  const truncateTitle = (t: string) => {
    if (t.length <= MAX_TITLE_LENGTH) return t;
    return t.substring(0, MAX_TITLE_LENGTH - 3) + "...";
  };

  const flushContent = () => {
    if (currentContent.length === 0) return;

    const bullets = currentContent.filter(line => line.match(/^[- *•] /));
    const text = currentContent.filter(line => !line.match(/^[- *•] /));

    if (bullets.length > 0) {
      const cleanBullets = bullets.map(b => b.replace(/^[- *•] /, "").trim());
      
      // Split into multiple slides if too many bullets
      for (let i = 0; i < cleanBullets.length; i += MAX_BULLETS_PER_SLIDE) {
        const slideBullets = cleanBullets.slice(i, i + MAX_BULLETS_PER_SLIDE);
        const slideTitle = currentSection || `Conteúdo ${slides.length + 1}`;
        const part = cleanBullets.length > MAX_BULLETS_PER_SLIDE ? 
          ` (${Math.floor(i / MAX_BULLETS_PER_SLIDE) + 1}/${Math.ceil(cleanBullets.length / MAX_BULLETS_PER_SLIDE)})` : 
          "";
        
        slides.push({
          type: "content",
          title: truncateTitle(slideTitle + part),
          bullets: slideBullets,
        });
      }
    } else if (text.length > 0) {
      const combinedText = text.join("\n\n");
      
      // Split text into chunks if too long (max ~500 chars per slide)
      const MAX_TEXT_LENGTH = 500;
      if (combinedText.length > MAX_TEXT_LENGTH) {
        const paragraphs = combinedText.split("\n\n");
        let chunk = "";
        let chunkIndex = 0;
        
        for (let para of paragraphs) {
          // If a single paragraph is too long, split it by sentences
          if (para.length > MAX_TEXT_LENGTH) {
            const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
            let sentenceChunk = "";
            
            for (const sentence of sentences) {
              if ((sentenceChunk + sentence).length > MAX_TEXT_LENGTH && sentenceChunk) {
                slides.push({
                  type: "content",
                  title: truncateTitle(`${currentSection || "Conteúdo"} (${chunkIndex + 1})`),
                  text: sentenceChunk.trim(),
                });
                chunkIndex++;
                sentenceChunk = sentence;
              } else {
                sentenceChunk += sentence;
              }
            }
            
            // Add remaining sentences as a chunk
            if (sentenceChunk.trim()) {
              if (chunk) {
                slides.push({
                  type: "content",
                  title: truncateTitle(`${currentSection || "Conteúdo"} (${chunkIndex + 1})`),
                  text: chunk.trim(),
                });
                chunkIndex++;
              }
              chunk = sentenceChunk;
            }
          } else if ((chunk + "\n\n" + para).length > MAX_TEXT_LENGTH && chunk) {
            slides.push({
              type: "content",
              title: truncateTitle(`${currentSection || "Conteúdo"} (${chunkIndex + 1})`),
              text: chunk.trim(),
            });
            chunk = para;
            chunkIndex++;
          } else {
            chunk += (chunk ? "\n\n" : "") + para;
          }
        }
        
        if (chunk.trim()) {
          slides.push({
            type: "content",
            title: truncateTitle(`${currentSection || "Conteúdo"}${chunkIndex > 0 ? ` (${chunkIndex + 1})` : ""}`),
            text: chunk.trim(),
          });
        }
      } else {
        slides.push({
          type: "content",
          title: truncateTitle(currentSection || `Conteúdo ${slides.length + 1}`),
          text: combinedText,
        });
      }
    }
    currentContent = [];
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      flushContent();
      const titleText = line.replace("# ", "").trim();
      currentSection = titleText;
      if (slides.length === 0 && titleText.toLowerCase() !== title.toLowerCase()) {
        slides.push({
          type: "title",
          title: truncateTitle(titleText),
        });
      }
      currentSection = null;
    } else if (line.startsWith("## ")) {
      flushContent();
      currentSection = line.replace("## ", "").trim();
    } else if (line.startsWith("### ")) {
      flushContent();
      currentSection = line.replace("### ", "").trim();
    } else if (line.trim()) {
      currentContent.push(line);
    }
  }

  flushContent();

  slides.push({
    type: "conclusion",
    title: "Conclusão",
    bullets: [
      "Revise o material regularmente",
      "Pratique com exercícios",
      "Tire suas dúvidas",
    ],
  });

  const generator = new PPTGenerator();
  return generator.generate({
    title,
    subtitle: "Material de Estudo Personalizado",
    author,
    slides,
    theme: options?.theme || "professional",
    learningDifficulties: options?.difficulties,
  });
}
