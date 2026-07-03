// Required for static export - generates static params for dynamic routes
export async function generateStaticParams() {
  return [
    { gameId: 'demo' },  // Fallback page for static generation
    { gameId: 'example' }, // Additional fallback
  ];
}

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 