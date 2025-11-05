/**
 * MindMapViewerPlaceholder - Placeholder for MindMap viewer
 * This allows the flashcards package to be independent of the mindmaps package
 * Apps can provide their own MindMapViewer through props
 */

export default function MindMapViewerPlaceholder() {
  return (
    <div className="p-8 text-center text-muted-foreground">
      Mind Map viewer not available. This feature requires the @nup/mindmaps package.
    </div>
  );
}
