
import React, { useState } from 'react';
import { User, Plus, Phone, Mail, Trash2 } from 'lucide-react';
import { Customer } from '../types';

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, onAddCustomer, onDeleteCustomer }) => {
  const [showForm, setShowForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    
    onAddCustomer({
      id: crypto.randomUUID(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email
    });
    setNewCustomer({ name: '', phone: '', email: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800">Clientes Cadastrados</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          <Plus size={18} /> <span className="hidden md:inline">Novo Cliente</span><span className="md:hidden">Novo</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border animate-in slide-in-from-top-4">
          <h3 className="font-bold mb-4">Adicionar Cliente</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <input
                type="text"
                placeholder="Nome Completo *"
                required
                value={newCustomer.name}
                onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                className="p-3 border rounded-lg w-full bg-white text-gray-900"
             />
             <input
                type="tel"
                placeholder="Telefone"
                value={newCustomer.phone}
                onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                className="p-3 border rounded-lg w-full bg-white text-gray-900"
             />
             <input
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                className="p-3 border rounded-lg w-full bg-white text-gray-900"
             />
             <div className="md:col-span-3 flex gap-2 justify-end pt-2">
               <button 
                 type="button" 
                 onClick={() => setShowForm(false)} 
                 className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex-1 md:flex-none"
               >
                 Cancelar
               </button>
               <button 
                 type="submit" 
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex-1 md:flex-none"
               >
                 Salvar
               </button>
             </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
            <thead className="bg-gray-50 border-b">
                <tr>
                <th className="p-4 text-sm font-semibold text-gray-600">Nome</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Contato</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                        {c.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                        <div className="flex flex-col gap-1">
                        {c.phone && <span className="flex items-center gap-1"><Phone size={14} /> {c.phone}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail size={14} /> {c.email}</span>}
                        </div>
                    </td>
                    <td className="p-4 text-right">
                        <button onClick={() => onDeleteCustomer(c.id)} className="text-gray-400 hover:text-red-500 p-2">
                        <Trash2 size={20} />
                        </button>
                    </td>
                </tr>
                ))}
                {customers.length === 0 && (
                <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">
                        <User className="mx-auto mb-2 opacity-50" />
                        Nenhum cliente cadastrado.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
