/**
 * LARGE DOCUMENT PROCESSING - EXPORTS
 * 
 * Central export file for all large document processing services
 */

export { largeMaterialProcessor } from './LargeMaterialProcessor';
export { jobQueue } from './JobQueue';
export { documentStructureAnalyzer } from './DocumentStructureAnalyzer';
export { intelligentDocumentSplitter } from './IntelligentDocumentSplitter';

export type {
  DocumentStructure,
  DocumentSection,
  SplitPlan,
  DocumentPart,
  JobStatus,
  DocumentMetadata,
  IDocumentStructureAnalyzer,
  IIntelligentDocumentSplitter,
  IJobQueue,
} from './types';
