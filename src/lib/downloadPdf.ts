export function downloadRiderPdf(fileUrl: string, fileName: string) {
  const params = new URLSearchParams({
    url: fileUrl,
    name: fileName,
  });

  const viewerUrl = `/pdf-viewer?${params.toString()}`;
  const newWindow = window.open(viewerUrl, '_blank', 'noopener,noreferrer');

  if (!newWindow) {
    window.location.href = viewerUrl;
  }
}
