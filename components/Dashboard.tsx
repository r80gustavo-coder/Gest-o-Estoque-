
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Package, AlertTriangle, TrendingUp, Archive } from 'lucide-react';
import { Product } from '../types';

interface DashboardProps {
  products: Product[];
}

const Dashboard: React.FC<DashboardProps> = ({ products }) => {
  // Safety checks for calculations to prevent crashes
  const safeProducts = products || [];

  const totalItems = safeProducts.reduce((acc, p) => acc + (p.totalStock || 0), 0);
  const totalProducts = safeProducts.length;
  const lowStock = safeProducts.filter(p => (p.totalStock || 0) < 5).length;
  const totalValueEstimate = totalItems * 50; 

  // Data for Size Chart
  const sizeMap: { [key: string]: number } = {};
  
  safeProducts.forEach(p => {
    // Check if stocks object exists before iterating
    if (p.stocks) {
        Object.entries(p.stocks).forEach(([size, qty]) => {
            const quantity = Number(qty);
            if (!isNaN(quantity)) {
                sizeMap[size] = (sizeMap[size] || 0) + quantity;
            }
        });
    }
  });

  const sizeData = Object.entries(sizeMap).map(([name, value]) => ({ name, value }));

  // Data for Color Chart
  const colorData = safeProducts.reduce((acc: any, curr) => {
    if (!curr.color) return acc;
    
    const existing = acc.find((item: any) => item.name === curr.color);
    const stock = curr.totalStock || 0;

    if (existing) {
      existing.value += stock;
    } else {
      acc.push({ name: curr.color, value: stock });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="text-white" size={24} />
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Peças em Estoque" value={totalItems} icon={Package} color="bg-blue-500" />
        <StatCard title="Modelos/Cores" value={totalProducts} icon={Archive} color="bg-purple-500" />
        <StatCard title="Estoque Baixo" value={lowStock} icon={AlertTriangle} color="bg-orange-500" />
        <StatCard title="Valor Estimado" value={`R$ ${totalValueEstimate.toLocaleString()}`} icon={TrendingUp} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border h-80">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Distribuição por Tamanho</h3>
          {sizeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Sem dados de estoque.
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border h-80">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Top 5 Cores</h3>
          {colorData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={colorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {colorData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'][index % 5]} />
                    ))}
                </Pie>
                <Tooltip />
                </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Sem dados de cores.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
