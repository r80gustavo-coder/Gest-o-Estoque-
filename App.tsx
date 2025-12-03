
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductForm from './components/ProductForm';
import InventoryList from './components/InventoryList';
import CustomerList from './components/CustomerList';
import Login from './components/Login';
import Reports from './components/Reports';
import { Product, Transaction, ViewState, Customer } from './types';
import { ArrowDownLeft, ArrowUpRight, History, User, Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const App = () => {
  const [currentView, setCurrentView] = useState<ViewState>('CATALOG');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // --- Data Transformation Helpers ---
  // Supabase uses snake_case (color_hex), App uses camelCase (colorHex).
  const mapProductFromDB = (p: any): Product => ({
    id: p.id,
    reference: p.reference,
    name: p.name,
    color: p.color,
    colorHex: p.color_hex,
    imageUrl: p.image_url,
    description: p.description,
    stocks: p.stocks || {},
    totalStock: p.total_stock,
    price: p.price
  });

  const mapProductToDB = (p: Product) => ({
    id: p.id,
    reference: p.reference,
    name: p.name,
    color: p.color,
    color_hex: p.colorHex,
    image_url: p.imageUrl,
    description: p.description,
    stocks: p.stocks,
    total_stock: p.totalStock,
    price: p.price
  });

  const mapTransactionFromDB = (t: any): Transaction => ({
    id: t.id,
    productId: t.product_id,
    productName: t.product_name,
    type: t.type,
    quantity: t.quantity,
    size: t.size,
    date: t.date,
    customerId: t.customer_id,
    customerName: t.customer_name
  });

  // --- Fetch Data ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Products
      const { data: prodData, error: prodError } = await supabase.from('products').select('*');
      if (prodError) throw prodError;
      if (prodData) setProducts(prodData.map(mapProductFromDB));

      // 2. Fetch Transactions (Latest 100)
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (transError) throw transError;
      if (transData) setTransactions(transData.map(mapTransactionFromDB));

      // 3. Fetch Customers
      const { data: custData, error: custError } = await supabase.from('customers').select('*');
      if (custError) throw custError;
      if (custData) setCustomers(custData);

    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      alert("Erro ao conectar com o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('kavins_is_admin');
    if (storedAuth === 'true') {
      setIsAdmin(true);
      setCurrentView('DASHBOARD');
    }
    fetchData();
  }, []);

  // --- Auth Handlers ---
  const handleLogin = (status: boolean) => {
    setIsAdmin(status);
    sessionStorage.setItem('kavins_is_admin', 'true');
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('kavins_is_admin');
    setCurrentView('CATALOG');
  };

  // --- Action Handlers ---

  const handleSaveProducts = async (newProducts: Product[]) => {
    try {
      setIsLoading(true);
      // 1. Insert Products
      const dbProducts = newProducts.map(mapProductToDB);
      const { error: prodError } = await supabase.from('products').insert(dbProducts);
      if (prodError) throw prodError;

      // 2. Insert Initial Transactions
      const initialTransactions: any[] = [];
      newProducts.forEach(prod => {
          Object.entries(prod.stocks).forEach(([size, qty]) => {
              if (qty > 0) {
                  initialTransactions.push({
                      id: crypto.randomUUID(),
                      product_id: prod.id,
                      product_name: prod.name,
                      type: 'IN',
                      quantity: qty,
                      size: size,
                      date: new Date().toISOString()
                  });
              }
          });
      });

      if (initialTransactions.length > 0) {
        const { error: transError } = await supabase.from('transactions').insert(initialTransactions);
        if (transError) throw transError;
      }

      // Update Local State
      await fetchData();
      setCurrentView('INVENTORY');
    } catch (error) {
      console.error("Error saving products:", error);
      alert("Erro ao salvar produtos no banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
      if(confirm('Tem certeza que deseja remover este produto?')) {
          try {
            const { error } = await supabase.from('products').delete().match({ id });
            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== id));
          } catch (error) {
            console.error("Error deleting product:", error);
            alert("Erro ao excluir produto.");
          }
      }
  }

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
        const dbProduct = mapProductToDB(updatedProduct);
        // Remove created_at from update payload to avoid issues, though usually ignored
        const { created_at, ...updatePayload } = dbProduct as any;
        
        const { error } = await supabase
            .from('products')
            .update(updatePayload)
            .match({ id: updatedProduct.id });
        
        if (error) throw error;
        
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (error) {
        console.error("Error updating product:", error);
        alert("Erro ao atualizar produto.");
    }
  };

  const handleUpdateStock = async (productId: string, size: string, type: 'IN' | 'OUT', quantity: number, customerId?: string) => {
    try {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const currentQty = product.stocks[size] || 0;
        const newQty = type === 'IN' ? currentQty + quantity : Math.max(0, currentQty - quantity);
        const newStocks = { ...product.stocks, [size]: newQty };
        const newTotal = Object.values(newStocks).reduce((a: number, b: number) => a + b, 0);

        // 1. Update Product
        const { error: prodError } = await supabase
            .from('products')
            .update({ stocks: newStocks, total_stock: newTotal })
            .match({ id: productId });
        if (prodError) throw prodError;

        // 2. Create Transaction
        const customer = customers.find(c => c.id === customerId);
        const transactionPayload = {
            id: crypto.randomUUID(),
            product_id: productId,
            product_name: product.name,
            type,
            quantity,
            size,
            date: new Date().toISOString(),
            customer_id: customerId || null,
            customer_name: customer ? customer.name : null
        };
        
        const { error: transError } = await supabase.from('transactions').insert([transactionPayload]);
        if (transError) throw transError;

        // Update Local State Optimistically (or fetch)
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stocks: newStocks, totalStock: newTotal } : p));
        setTransactions(prev => [mapTransactionFromDB(transactionPayload), ...prev]);

    } catch (error) {
        console.error("Stock update failed:", error);
        alert("Erro ao atualizar estoque.");
    }
  };

  const handleBatchUpdateStock = async (updates: { productId: string, size: string, type: 'IN' | 'OUT', quantity: number }[]) => {
    if (updates.length === 0) return;
    setIsLoading(true);

    try {
        const transactionPayloads: any[] = [];
        
        // We must process updates sequentially or group by product to avoid race conditions on the same row,
        // but for simplicity in this code, we will iterate.
        
        for (const u of updates) {
            const product = products.find(p => p.id === u.productId);
            // NOTE: In a real batch scenario, we should fetch fresh data. 
            // Here we rely on local state 'product' which might be slightly stale if multiple updates hit same product in loop.
            // However, since 'updates' usually come from one grid edit, they are distinct size keys for same product.
            
            if (product) {
                // Determine new stocks based on CURRENT processing state (requires careful handling if multiple updates target same product)
                // Better approach: Calculate final state for each product first.
            }
        }

        // Optimized Approach: Group by Product
        const updatesByProduct: { [id: string]: { [size: string]: number } } = {};
        
        updates.forEach(u => {
            const p = products.find(prod => prod.id === u.productId);
            if (!p) return;

            if (!updatesByProduct[u.productId]) {
                // Deep copy stocks
                updatesByProduct[u.productId] = { ...p.stocks };
            }

            const current = updatesByProduct[u.productId][u.size] || 0;
            if (u.type === 'IN') {
                updatesByProduct[u.productId][u.size] = current + u.quantity;
            } else {
                updatesByProduct[u.productId][u.size] = Math.max(0, current - u.quantity);
            }

            // Prepare Transaction
            transactionPayloads.push({
                id: crypto.randomUUID(),
                product_id: u.productId,
                product_name: p.name,
                type: u.type,
                quantity: u.quantity,
                size: u.size,
                date: new Date().toISOString()
            });
        });

        // Execute DB Updates
        for (const [prodId, newStocks] of Object.entries(updatesByProduct)) {
            const newTotal = Object.values(newStocks).reduce((a, b) => a + b, 0);
            const { error } = await supabase
                .from('products')
                .update({ stocks: newStocks, total_stock: newTotal })
                .match({ id: prodId });
            if (error) throw error;
        }

        // Insert Transactions
        if (transactionPayloads.length > 0) {
            const { error } = await supabase.from('transactions').insert(transactionPayloads);
            if (error) throw error;
        }

        await fetchData(); // Refresh all
    } catch (error) {
        console.error("Batch update failed", error);
        alert("Erro na atualização em lote.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddCustomer = async (customer: Customer) => {
    try {
        const { error } = await supabase.from('customers').insert([customer]);
        if (error) throw error;
        setCustomers(prev => [...prev, customer]);
    } catch (error) {
        console.error("Error adding customer:", error);
        alert("Erro ao cadastrar cliente.");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if(confirm('Tem certeza que deseja remover este cliente?')) {
        try {
            const { error } = await supabase.from('customers').delete().match({ id });
            if (error) throw error;
            setCustomers(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting customer:", error);
        }
    }
  };

  const TransactionsView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Histórico de Movimentações</h2>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600">Data</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Produto</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Tam.</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Tipo</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Detalhes</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Qtd</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-600">
                  {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="p-4 font-medium text-gray-900">{t.productName}</td>
                <td className="p-4">
                     <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{t.size || 'N/A'}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                    t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {t.type === 'IN' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                    {t.type === 'IN' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {t.customerName ? (
                    <span className="flex items-center gap-1 text-indigo-600">
                      <User size={14} />
                      {t.customerName}
                    </span>
                  ) : '-'}
                </td>
                <td className="p-4 font-bold text-gray-800">{t.quantity}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                        <History className="mx-auto mb-2 opacity-50" />
                        Nenhuma movimentação registrada.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (isLoading && currentView === 'CATALOG' && products.length === 0) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
              <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
              <p className="text-gray-500 font-medium">Carregando sistema...</p>
          </div>
      )
  }

  return (
    <Layout currentView={currentView} setView={setCurrentView} isAdmin={isAdmin} onLogout={handleLogout}>
      
      {currentView === 'LOGIN' && (
        <Login onLogin={handleLogin} onCancel={() => setCurrentView('CATALOG')} />
      )}

      {(currentView === 'CATALOG' || (!isAdmin && currentView !== 'LOGIN')) && (
        <InventoryList 
          products={products} 
          customers={customers}
          onUpdateStock={handleUpdateStock}
          onBatchUpdateStock={handleBatchUpdateStock} 
          onDelete={handleDeleteProduct}
          onEdit={handleEditProduct}
          onAddProduct={handleSaveProducts}
          isAdmin={false}
        />
      )}

      {isAdmin && (
        <>
          {currentView === 'DASHBOARD' && <Dashboard products={products} />}
          {currentView === 'REPORTS' && <Reports products={products} transactions={transactions} />}
          {currentView === 'ADD_PRODUCT' && (
            <ProductForm 
              onSave={handleSaveProducts} 
              onCancel={() => setCurrentView('INVENTORY')} 
            />
          )}
          {currentView === 'INVENTORY' && (
            <InventoryList 
              products={products} 
              customers={customers}
              onUpdateStock={handleUpdateStock}
              onBatchUpdateStock={handleBatchUpdateStock}
              onDelete={handleDeleteProduct}
              onEdit={handleEditProduct}
              onAddProduct={handleSaveProducts}
              isAdmin={true}
            />
          )}
          {currentView === 'CUSTOMERS' && (
            <CustomerList 
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}
          {currentView === 'TRANSACTIONS' && <TransactionsView />}
        </>
      )}
    </Layout>
  );
};

export default App;
