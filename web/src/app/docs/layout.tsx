import { DocsSidebar } from '@/components/docs/DocsSidebar';

export const metadata = {
  title: 'Documentation - Pay Lobster',
  description: 'Comprehensive documentation for Pay Lobster - the trustless payment infrastructure for AI agents.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="flex">
        <DocsSidebar />
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
