import pptxgen from "pptxgenjs";

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
  private pres: pptxgen;

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
          this.addSectionTitleSlide(slideContent, styles);
          break;
        case "content":
          this.addContentSlide(slideContent, styles);
          break;
        case "image":
          this.addImageSlide(slideContent, styles);
          break;
        case "comparison":
          this.addComparisonSlide(slideContent, styles);
          break;
        case "conclusion":
          this.addConclusionSlide(slideContent, styles);
          break;
      }
    }

    this.addFooterToAllSlides(config.author, styles);

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

  private addSectionTitleSlide(
    content: SlideContent,
    styles: AdaptiveStyles
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
  }

  private addContentSlide(content: SlideContent, styles: AdaptiveStyles) {
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
        h: 3.5,
        fontSize: styles.fontSize.body,
        color: styles.colors.text,
        bullet: { type: "number", indent: styles.spacing.bulletIndent },
        lineSpacing: styles.spacing.lineSpacing * 14,
      });
    } else if (content.text) {
      slide.addText(content.text, {
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 3.5,
        fontSize: styles.fontSize.body,
        color: styles.colors.text,
        lineSpacing: styles.spacing.lineSpacing * 14,
      });
    }
  }

  private addImageSlide(content: SlideContent, styles: AdaptiveStyles) {
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
  }

  private addComparisonSlide(content: SlideContent, styles: AdaptiveStyles) {
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
  }

  private addConclusionSlide(content: SlideContent, styles: AdaptiveStyles) {
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
  }

  private addFooterToAllSlides(author: string, styles: AdaptiveStyles) {
    this.pres.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: styles.colors.background },
      objects: [
        {
          text: {
            text: `${author} | NuP-Study`,
            options: {
              x: 0.5,
              y: 5.3,
              w: 4.0,
              h: 0.3,
              fontSize: 10,
              color: styles.colors.secondary,
            },
          },
        },
        {
          text: {
            text: "Slide %page% de %pages%",
            options: {
              x: 5.5,
              y: 5.3,
              w: 4.0,
              h: 0.3,
              fontSize: 10,
              color: styles.colors.secondary,
              align: "right",
            },
          },
        },
      ],
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
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  const slides: SlideContent[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();

    if (para.startsWith("# ")) {
      slides.push({
        type: "title",
        title: para.replace("# ", ""),
      });
    } else if (para.startsWith("## ")) {
      slides.push({
        type: "title",
        title: para.replace("## ", ""),
      });
    } else if (para.includes("\n- ") || para.includes("\n* ")) {
      const lines = para.split("\n");
      const slideTitle = lines[0];
      const bullets = lines.slice(1).map((l) => l.replace(/^[- *] /, ""));

      slides.push({
        type: "content",
        title: slideTitle,
        bullets,
      });
    } else {
      slides.push({
        type: "content",
        title: `Slide ${slides.length + 1}`,
        text: para,
      });
    }
  }

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
