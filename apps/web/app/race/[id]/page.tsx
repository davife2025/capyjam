import { GameCanvas } from "@/components/GameCanvas";

interface RacePageProps {
  params: { id: string };
}

export default function RacePage({ params }: RacePageProps) {
  const isQuick = params.id === "quick";
  return (
    <main className="min-h-screen flex flex-col bg-gray-950">
      <GameCanvas
        roomId={isQuick ? undefined : params.id}
        trackId="00000000-0000-0000-0000-000000000001"
      />
    </main>
  );
}

export async function generateStaticParams() {
  return [{ id: "quick" }];
}
