import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, Packer, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { ImpactAnalysis } from '../types';

interface ImageData {
  id: string;
  base64: string;
  name: string;
}

export const exportToWord = async (data: ImpactAnalysis) => {
  // Function to convert base64 to buffer for images
  const base64ToBuffer = (base64: string): Uint8Array => {
    try {
      const base64Data = base64.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('Error converting base64 to buffer:', error);
      return new Uint8Array(0);
    }
  };

  // Function to parse image data from stored string
  const parseImageData = (data: string): { images: ImageData[], text: string } => {
    if (!data) return { images: [], text: '' };
    
    const lines = data.split('\n');
    const images: ImageData[] = [];
    const textLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('IMAGE_DATA:')) {
        try {
          const imageJson = line.replace('IMAGE_DATA:', '');
          const imageData = JSON.parse(imageJson);
          images.push(imageData);
        } catch (error) {
          console.error('Error parsing image data:', error);
        }
      } else if (line.trim() && !line.startsWith('[Imagem ')) {
        textLines.push(line);
      }
    }

    return { images, text: textLines.join('\n') };
  };

  // Parse function point analysis from work details
  const parseFunctionPointAnalysis = (workDetails: string | undefined) => {
    if (!workDetails) return null;
    
    // Check if there's extracted data
    if (!workDetails.includes('=== DADOS EXTRAÍDOS POR IA ===')) return null;
    
    const extractedDataSection = workDetails.split('=== DADOS EXTRAÍDOS POR IA ===')[1];
    if (!extractedDataSection) return null;
    
    // Parse the data
    const processTypeMatch = extractedDataSection.match(/Processo Elementar: (\w+) \(([^)]+)\)/);
    const complexityMatch = extractedDataSection.match(/Complexidade: (\w+)/);
    const totalFPMatch = extractedDataSection.match(/Total de Pontos de Função: (\d+)/);
    
    if (!processTypeMatch || !complexityMatch || !totalFPMatch) return null;
    
    return {
      processType: processTypeMatch[1],
      processTypeDescription: processTypeMatch[2],
      complexity: complexityMatch[1],
      totalFunctionPoints: parseInt(totalFPMatch[1], 10)
    };
  };

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "2563EB",
          },
          paragraph: {
            spacing: {
              after: 300,
            },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "subtitle",
          name: "Subtitle",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 16,
            color: "6B7280",
          },
          paragraph: {
            spacing: {
              after: 400,
            },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 24,
            bold: true,
            color: "1F2937",
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        {
          id: "heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 20,
            bold: true,
            color: "374151",
          },
          paragraph: {
            spacing: {
              before: 200,
              after: 100,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          // Title Page
          new Paragraph({
            text: data.title || "Análise de Impacto",
            style: "title",
          }),
          
          new Paragraph({
            text: "Documento de Análise de Impacto",
            style: "subtitle",
          }),

          // Document Info Table with better formatting
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Número da PA:", bold: true })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "F3F4F6" },
                  }),
                  new TableCell({
                    children: [new Paragraph(data.title || "N/A")],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Projeto:", bold: true })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "F3F4F6" },
                  }),
                  new TableCell({
                    children: [new Paragraph(data.project || "N/A")],
                    width: { size: 25, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Autor:", bold: true })]
                    })],
                    shading: { fill: "F3F4F6" },
                  }),
                  new TableCell({
                    children: [new Paragraph(data.author || "N/A")],
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Data:", bold: true })]
                    })],
                    shading: { fill: "F3F4F6" },
                  }),
                  new TableCell({
                    children: [new Paragraph(new Date(data.date).toLocaleDateString('pt-BR') || "N/A")],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "Versão:", bold: true })]
                    })],
                    shading: { fill: "F3F4F6" },
                  }),
                  new TableCell({
                    children: [new Paragraph(data.version || "N/A")],
                  }),
                  new TableCell({
                    children: [new Paragraph("")],
                  }),
                  new TableCell({
                    children: [new Paragraph("")],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 400 } }),

          // Description
          ...(data.description ? [
            new Paragraph({
              text: "1. Descrição",
              style: "heading1",
            }),
            new Paragraph({
              text: data.description,
              spacing: { after: 300 },
            }),
          ] : []),

          // Scope
          new Paragraph({
            text: "2. Escopo",
            style: "heading1",
          }),

          ...(data.scope.processes.length > 0 ? [
            new Paragraph({
              text: "2.1 Funcionalidades Impactadas",
              style: "heading2",
            }),
            
            // Create separate table for each functionality
            ...data.scope.processes.flatMap((process, index) => {
              const elements: (Table | Paragraph)[] = [];
              const { images, text } = parseImageData(process.screenshots || '');
              const fpAnalysis = parseFunctionPointAnalysis(process.workDetails);
              
              // Add functionality title
              elements.push(
                new Paragraph({
                  children: [new TextRun({ text: `Funcionalidade ${index + 1}: ${process.name}`, bold: true })],
                  spacing: { before: 200, after: 100 },
                })
              );

              // Create table for this functionality
              const tableRows = [
                // Header row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Campo", bold: true })]
                      })],
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Informação", bold: true })]
                      })],
                      width: { size: 70, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                  ],
                }),
                // Status row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph("Status")],
                    }),
                    new TableCell({
                      children: [new Paragraph(process.status.charAt(0).toUpperCase() + process.status.slice(1))],
                    }),
                  ],
                }),
              ];

              // Add Websis row if applicable
              if (process.status === 'alterada' && process.websisCreated !== undefined) {
                tableRows.push(
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph("Websis Criou/Alterou Antes")],
                      }),
                      new TableCell({
                        children: [new Paragraph(process.websisCreated ? 'SIM' : 'NÃO')],
                      }),
                    ],
                  })
                );
              }

              // Add Function Point Analysis if available
              if (fpAnalysis) {
                tableRows.push(
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph("Análise de Pontos de Função")],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: "Processo Elementar: ", bold: true }),
                              new TextRun(`${fpAnalysis.processType} (${fpAnalysis.processTypeDescription})`),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: "Complexidade: ", bold: true }),
                              new TextRun(fpAnalysis.complexity),
                            ],
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({ text: "Total de Pontos de Função: ", bold: true }),
                              new TextRun(`${fpAnalysis.totalFunctionPoints}`),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                );
              }

              // Add work details row if available
              if (process.workDetails && process.workDetails.trim()) {
                // Remove the AI extracted data section for cleaner output
                let cleanWorkDetails = process.workDetails;
                if (cleanWorkDetails.includes('=== DADOS EXTRAÍDOS POR IA ===')) {
                  cleanWorkDetails = cleanWorkDetails.split('=== DADOS EXTRAÍDOS POR IA ===')[0].trim();
                }
                
                if (cleanWorkDetails) {
                  tableRows.push(
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph("Detalhamento do Trabalho")],
                        }),
                        new TableCell({
                          children: [new Paragraph(cleanWorkDetails)],
                        }),
                      ],
                    })
                  );
                }
              }

              elements.push(
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  },
                  rows: tableRows,
                })
              );

              // Add screenshots if available
              if (process.screenshots && process.screenshots.trim()) {
                if (text.trim() || images.length > 0) {
                  elements.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Prints das Telas:", bold: true })],
                      spacing: { before: 150, after: 100 },
                    })
                  );

                  if (text.trim()) {
                    elements.push(
                      new Paragraph({
                        text: text,
                        spacing: { after: 100 },
                      })
                    );
                  }

                  // Add images
                  images.forEach((imageData, imgIndex) => {
                    try {
                      const imageBuffer = base64ToBuffer(imageData.base64);
                      if (imageBuffer.length > 0) {
                        elements.push(
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: imageBuffer,
                                transformation: {
                                  width: 400,
                                  height: 300,
                                },
                              }),
                            ],
                            spacing: { after: 100 },
                            alignment: AlignmentType.CENTER,
                          })
                        );
                        
                        // Add image caption
                        elements.push(
                          new Paragraph({
                            text: imageData.name,
                            spacing: { after: 150 },
                            alignment: AlignmentType.CENTER,
                            run: {
                              italics: true,
                              size: 18,
                              color: "666666",
                            },
                          })
                        );
                      }
                    } catch (error) {
                      console.error('Error processing image:', error);
                      elements.push(
                        new Paragraph({
                          text: `[${imageData.name} - Erro ao processar imagem]`,
                          spacing: { after: 100 },
                          alignment: AlignmentType.CENTER,
                          run: {
                            italics: true,
                            color: "FF0000",
                          },
                        })
                      );
                    }
                  });
                }
              }

              // Add spacing after each functionality
              elements.push(new Paragraph({ text: "", spacing: { after: 200 } }));
              
              return elements;
            }),
          ] : [
            new Paragraph({
              text: "Nenhuma funcionalidade definida no escopo.",
              spacing: { after: 300 },
            }),
          ]),

          // Impacts
          new Paragraph({
            text: "3. Análise de Impactos",
            style: "heading1",
          }),

          ...generateImpactSections(data),

          // Risks
          ...(data.risks.length > 0 ? [
            new Paragraph({
              text: "4. Matriz de Riscos",
              style: "heading1",
            }),
            
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Descrição do Risco", bold: true })]
                      })],
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Impacto", bold: true })]
                      })],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Probabilidade", bold: true })]
                      })],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Mitigação", bold: true })]
                      })],
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                  ],
                }),
                ...data.risks.map(risk => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(risk.description)],
                      }),
                      new TableCell({
                        children: [new Paragraph(risk.impact.charAt(0).toUpperCase() + risk.impact.slice(1))],
                      }),
                      new TableCell({
                        children: [new Paragraph(risk.probability.charAt(0).toUpperCase() + risk.probability.slice(1))],
                      }),
                      new TableCell({
                        children: [new Paragraph(risk.mitigation || 'N/A')],
                      }),
                    ],
                  })
                ),
              ],
            }),
          ] : []),

          // Mitigations
          ...(data.mitigations.length > 0 ? [
            new Paragraph({
              text: "5. Plano de Mitigação",
              style: "heading1",
            }),
            
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Ação", bold: true })]
                      })],
                      width: { size: 40, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Responsável", bold: true })]
                      })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Prazo", bold: true })]
                      })],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Prioridade", bold: true })]
                      })],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                      shading: { fill: "E5E7EB" },
                    }),
                  ],
                }),
                ...data.mitigations.map(mitigation => 
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(mitigation.action)],
                      }),
                      new TableCell({
                        children: [new Paragraph(mitigation.responsible)],
                      }),
                      new TableCell({
                        children: [new Paragraph(new Date(mitigation.deadline).toLocaleDateString('pt-BR'))],
                      }),
                      new TableCell({
                        children: [new Paragraph(mitigation.priority.charAt(0).toUpperCase() + mitigation.priority.slice(1))],
                      }),
                    ],
                  })
                ),
              ],
            }),
          ] : []),

          // Conclusions
          ...(data.conclusions.summary || data.conclusions.recommendations.length > 0 || data.conclusions.nextSteps.length > 0 ? [
            new Paragraph({
              text: "6. Conclusões e Recomendações",
              style: "heading1",
            }),

            ...(data.conclusions.summary ? [
              new Paragraph({
                text: "6.1 Resumo Executivo",
                style: "heading2",
              }),
              new Paragraph({
                text: data.conclusions.summary,
                spacing: { after: 200 },
              }),
            ] : []),

            ...(data.conclusions.recommendations.length > 0 ? [
              new Paragraph({
                text: "6.2 Recomendações",
                style: "heading2",
              }),
              ...data.conclusions.recommendations.map(recommendation => 
                new Paragraph({
                  text: `• ${recommendation}`,
                  spacing: { after: 100 },
                })
              ),
            ] : []),

            ...(data.conclusions.nextSteps.length > 0 ? [
              new Paragraph({
                text: "6.3 Próximos Passos",
                style: "heading2",
              }),
              ...data.conclusions.nextSteps.map(step => 
                new Paragraph({
                  text: `• ${step}`,
                  spacing: { after: 100 },
                })
              ),
            ] : []),
          ] : []),
          
          // Footer with NuPTechs branding
          new Paragraph({
            text: "",
            spacing: { before: 400 },
          }),
          new Paragraph({
            text: "NuPTechs - Sua fábrica de softwares inteligentes",
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            run: {
              italics: true,
              color: "6B7280",
            },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${data.title || 'Analise_de_Impacto'}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
};

function generateImpactSections(data: ImpactAnalysis): Paragraph[] {
  const sections: Paragraph[] = [];
  const categories = {
    business: 'Impactos de Negócio',
    technical: 'Impactos Técnicos',
    operational: 'Impactos Operacionais',
    financial: 'Impactos Financeiros'
  };

  let sectionNumber = 1;

  Object.entries(categories).forEach(([category, title]) => {
    const impacts = data.impacts[category as keyof typeof data.impacts];
    
    if (impacts.length > 0) {
      sections.push(
        new Paragraph({
          text: `3.${sectionNumber} ${title}`,
          style: "heading2",
        })
      );

      impacts.forEach((impact, index) => {
        sections.push(
          new Paragraph({
            text: `• ${impact.description}`,
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "  Severidade: ", bold: true }),
              new TextRun({ text: impact.severity.charAt(0).toUpperCase() + impact.severity.slice(1) }),
              new TextRun({ text: " | " }),
              new TextRun({ text: "Probabilidade: ", bold: true }),
              new TextRun({ text: impact.probability.charAt(0).toUpperCase() + impact.probability.slice(1) })
            ],
            spacing: { after: 100 },
          })
        );
      });

      sections.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      sectionNumber++;
    }
  });

  return sections;
}