
import React from 'react';
import { LayoutDashboard, Shirt, PlusCircle, ArrowRightLeft, Menu, X, Users, LogOut, LogIn, Grid, FileBarChart } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isAdmin: boolean;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, isAdmin, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
        currentView === view
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <h1 className="text-xl font-bold text-indigo-900">Kavin's</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-gray-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky md:top-0 h-full w-64 bg-white border-r z-20 transform transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } top-0 md:top-0 flex flex-col shadow-xl md:shadow-none`}
      >
        <div className="p-6 border-b flex justify-between items-center md:block">
          <div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Kavin's
            </h1>
            <p className="text-xs text-gray-500 mt-1">{isAdmin ? 'Modo Admin' : 'Catálogo Digital'}</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {!isAdmin ? (
            <>
              <NavItem view="CATALOG" icon={Grid} label="Catálogo" />
              <button
                onClick={() => {
                  setView('LOGIN');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 mt-4 border-t"
              >
                <LogIn size={20} />
                <span className="font-medium">Área Administrativa</span>
              </button>
            </>
          ) : (
            <>
              <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
              <NavItem view="REPORTS" icon={FileBarChart} label="Relatórios" />
              <NavItem view="INVENTORY" icon={Shirt} label="Estoque" />
              <NavItem view="ADD_PRODUCT" icon={PlusCircle} label="Cadastrar Peça" />
              <NavItem view="CUSTOMERS" icon={Users} label="Clientes" />
              <NavItem view="TRANSACTIONS" icon={ArrowRightLeft} label="Movimentações" />
            </>
          )}
        </nav>

        {isAdmin && (
          <div className="p-4 border-t bg-gray-50 md:bg-white">
             <button
              onClick={onLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-8 overflow-y-auto w-full max-w-[100vw]">
        <div className="max-w-6xl mx-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
