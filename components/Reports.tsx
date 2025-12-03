
import React from 'react';
import { Product, Transaction } from '../types';
import { DollarSign, TrendingUp, AlertTriangle, Package, ShoppingBag } from 'lucide-react';

interface ReportsProps {
  products: Product[];
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ products, transactions }) => {
  const safeProducts = products || [];
  
  // Calculations
  const totalStockValue = safeProducts.reduce((acc, p) => {
    return acc + (p.totalStock * (p.price || 0));
  }, 0);

  const totalItems = safeProducts.reduce((acc, p) => acc + p.totalStock, 0);
  
  const lowStockItems = safeProducts.filter(p => p.totalStock < 5 && p.totalStock > 0);
  const outOfStockItems = safeProducts.filter(p => p.totalStock === 0);

  const salesVolume = transactions
    .filter(t => t.type === 'OUT')
    .reduce((acc, t) => {
        const product = products.find(p => p.id === t.productId);
        return acc + (t.quantity * (product?.price || 0));
    }, 0);

  const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className="text-gray-500 text-sm font-medium">{title}</p>
           <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color} text-white`}>
            <Icon size={24} />
        </div>
      </div>
      {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Relatórios Financeiros & Estoque</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Valor em Estoque" 
            value={`R$ ${totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={DollarSign} 
            color="bg-green-600"
            subtext="Baseado no preço de venda atual"
        />
         <StatCard 
            title="Volume de Saídas (Est.)" 
            value={`R$ ${salesVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={TrendingUp} 
            color="bg-blue-600"
            subtext="Total histórico calculado"
        />
        <StatCard 
            title="Total de Peças" 
            value={totalItems} 
            icon={Package} 
            color="bg-indigo-600" 
        />
        <StatCard 
            title="Itens Zerados" 
            value={outOfStockItems.length} 
            icon={ShoppingBag} 
            color="bg-red-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-orange-500"/> Alerta de Estoque Baixo
            </h3>
            <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-sm text-left min-w-[300px]">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="p-3 pl-4 rounded-l-lg">Produto</th>
                            <th className="p-3">Cor</th>
                            <th className="p-3 pr-4 rounded-r-lg text-right">Qtd</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {lowStockItems.slice(0, 10).map(p => (
                            <tr key={p.id}>
                                <td className="p-3 pl-4 font-medium">{p.reference} - {p.name}</td>
                                <td className="p-3">{p.color}</td>
                                <td className="p-3 pr-4 text-right font-bold text-orange-600">{p.totalStock}</td>
                            </tr>
                        ))}
                        {lowStockItems.length === 0 && (
                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">Tudo certo! Nenhum item com estoque crítico.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
             <h3 className="font-bold text-lg text-gray-800 mb-4">Itens Sem Estoque</h3>
             <div className="overflow-x-auto -mx-4 md:mx-0 max-h-80 overflow-y-auto">
                <table className="w-full text-sm text-left min-w-[300px]">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="p-3 pl-4 rounded-l-lg">Referência</th>
                            <th className="p-3">Cor</th>
                            <th className="p-3 pr-4 rounded-r-lg">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {outOfStockItems.slice(0, 20).map(p => (
                            <tr key={p.id}>
                                <td className="p-3 pl-4 font-mono text-gray-900 font-medium">{p.reference}</td>
                                <td className="p-3">
                                    <span className="flex items-center gap-2 text-gray-700">
                                        <div className="w-3 h-3 rounded-full border shrink-0" style={{backgroundColor: p.colorHex}}></div>
                                        {p.color}
                                    </span>
                                </td>
                                <td className="p-3 pr-4"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Esgotado</span></td>
                            </tr>
                        ))}
                         {outOfStockItems.length === 0 && (
                            <tr><td colSpan={3} className="p-4 text-center text-gray-400">Nenhum item esgotado.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
