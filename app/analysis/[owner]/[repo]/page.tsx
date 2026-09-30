import { AnalysisView } from "@/components/analysis/AnalysisView";

export default async function AnalysisPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;

  return <AnalysisView owner={decodeURIComponent(owner)} repo={decodeURIComponent(repo)} />;
}
