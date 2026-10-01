import { ReactNode } from 'react';
import { Header } from '@/components/Header';

interface MainLayoutProps {
  children: ReactNode;
  rightPanel?: ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddCompany?: () => void;
}

/**
 * MainLayout - Full-screen map layout
 * Header on top, map fills remaining space.
 * Right panel overlays on mobile, grid-integrated on desktop.
 */
export const MainLayout = ({ 
  children, 
  rightPanel, 
  searchQuery, 
  onSearchChange,
  onAddCompany
}: MainLayoutProps) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/30">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onAddCompany={onAddCompany}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Map - full width */}
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
        
        {/* Right Panel */}
        {rightPanel}
      </div>
    </div>
  );
};
