
import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, X, Box, ChevronRight, Edit2, Save, XCircle, AlertCircle, Grid3X3, User, EyeOff, Eye, DollarSign } from 'lucide-react';
import { Product, SIZES, Customer } from '../types';

interface InventoryListProps {
  products: Product[];
  customers: Customer[];
  onUpdateStock: (productId: string, size: string, type: 'IN' | 'OUT', quantity: number, customerId?: string) => void;
  onBatchUpdateStock?: (updates: { productId: string, size: string, type: 'IN' | 'OUT', quantity: number }[]) => void;
  onDelete: (productId: string) => void;
  onEdit?: (product: Product) => void;
  onAddProduct?: (products: Product[]) => void;
  isAdmin: boolean;
}

// Helper to group products by Image URL
const groupProductsByImage = (products: Product[]) => {
  const groups: { [key: string]: Product[] } = {};
  
  products.forEach(p => {
    const key = p.imageUrl || 'no-image';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });
  
  return Object.values(groups);
};

const InventoryList: React.FC<InventoryListProps> = ({ products, customers, onUpdateStock, onBatchUpdateStock, onDelete, onEdit, onAddProduct, isAdmin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
  
  // Adjustment State
  const [adjustingItem, setAdjustingItem] = useState<{ 
      candidates: Product[], 
      selectedProductId: string,
      size: string, 
      type: 'IN' | 'OUT',
      colorName: string
  } | null>(null);
  
  const [adjustQty, setAdjustQty] = useState<number | string>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  // Editing State
  const [editingColorKey, setEditingColorKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ color: string; colorHex: string }>({ color: '', colorHex: '' });
  
  // Grid Editing State
  const [gridEditingColorKey, setGridEditingColorKey] = useState<string | null>(null);
  const [gridState, setGridState] = useState<{ [productId: string]: { [size: string]: number } }>({});

  // Edit Specific Reference State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductForm, setEditProductForm] = useState({ reference: '', name: '', price: '' });

  // UI Toggles
  const [hideZeroStock, setHideZeroStock] = useState(true);

  // 1. Filter Individual Products first
  const filteredRawProducts = useMemo(() => products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.color.toLowerCase().includes(searchTerm.toLowerCase())
  ), [products, searchTerm]);

  // 2. Group them by Image
  const productGroups = useMemo(() => groupProductsByImage(filteredRawProducts), [filteredRawProducts]);

  // 3. Get currently selected group dynamically
  const selectedGroup = useMemo(() => {
    if (!selectedImageKey) return null;
    return products.filter(p => p.imageUrl === selectedImageKey);
  }, [products, selectedImageKey]);

  // Determine Grade Label based on stocks keys
  const getGradeLabel = (stocks: { [key: string]: number }) => {
    const keys = Object.keys(stocks);
    if (keys.length === 0) return 'Sem Grade';
    const hasPlus = keys.some(k => ['G1', 'G2', 'G3'].includes(k));
    const hasStandard = keys.some(k => ['P', 'M', 'G', 'GG'].includes(k));
    
    if (hasPlus && hasStandard) return 'Mista';
    if (hasPlus) return 'G1 ao G3';
    return 'P ao GG';
  };

  const handleAdjustSubmit = () => {
    const qty = typeof adjustQty === 'string' ? parseInt(adjustQty) : adjustQty;

    if (adjustingItem && qty > 0) {
        if (adjustingItem.type === 'OUT') {
            const targetProduct = products.find(p => p.id === adjustingItem.selectedProductId);
            const currentStock = targetProduct?.stocks[adjustingItem.size] || 0;
            if (currentStock < qty) {
                return;
            }
        }

      onUpdateStock(
        adjustingItem.selectedProductId, 
        adjustingItem.size, 
        adjustingItem.type, 
        qty, 
        selectedCustomer || undefined
      );
      
      setAdjustingItem(null); 
      setAdjustQty(1);
      setSelectedCustomer('');
    }
  };

  const openAdjustment = (productsInColor: Product[], size: string, type: 'IN' | 'OUT') => {
    if (productsInColor.length === 0) return;

    let defaultProduct = productsInColor.find(p => p.stocks.hasOwnProperty(size));
    if (!defaultProduct) defaultProduct = productsInColor[0];

    setAdjustingItem({ 
        candidates: productsInColor,
        selectedProductId: defaultProduct.id,
        size, 
        type,
        colorName: defaultProduct.color
    });
    setAdjustQty(1);
    setSelectedCustomer('');
  };

  // Color Batch Editing
  const startEditingColor = (colorKey: string, productsInColor: Product[]) => {
    const first = productsInColor[0];
    setEditingColorKey(colorKey);
    setEditForm({ 
        color: first.color, 
        colorHex: first.colorHex || '#000000' 
    });
  };

  const saveEditingColor = (productsInColor: Product[]) => {
    if (onEdit) {
        productsInColor.forEach(p => {
             onEdit({
                ...p,
                color: editForm.color,
                colorHex: editForm.colorHex,
                name: p.name.replace(p.color, editForm.color) 
             });
        });
        setEditingColorKey(null);
    }
  };

  // Grid Editing Functions
  const startGridEditing = (colorKey: string, productsInColor: Product[]) => {
    const initialState: any = {};
    productsInColor.forEach(p => {
      initialState[p.id] = { ...p.stocks };
    });
    setGridState(initialState);
    setGridEditingColorKey(colorKey);
  };

  const handleGridChange = (productId: string, size: string, value: string) => {
    const qty = parseInt(value);
    if (!isNaN(qty) && qty >= 0) {
      setGridState(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [size]: qty
        }
      }));
    } else if (value === '') {
        setGridState(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          [size]: 0
        }
      }));
    }
  };

  const saveGridEditing = (productsInColor: Product[]) => {
    if (!onBatchUpdateStock) return;

    const updates: { productId: string, size: string, type: 'IN' | 'OUT', quantity: number }[] = [];

    productsInColor.forEach(p => {
      const newStocks = gridState[p.id] || {};
      SIZES.forEach(size => {
        const oldQty = p.stocks[size] || 0;
        const newQty = newStocks[size] || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          updates.push({
            productId: p.id,
            size,
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(diff)
          });
        }
      });
    });

    if (updates.length > 0) {
      onBatchUpdateStock(updates);
    }
    setGridEditingColorKey(null);
  };

  // Individual Product Editing
  const startEditingProduct = (p: Product) => {
      setEditingProduct(p);
      setEditProductForm({ 
          reference: p.reference, 
          name: p.name,
          price: p.price ? p.price.toString() : ''
      });
  }

  const saveEditingProduct = () => {
      if (editingProduct && onEdit) {
          const newPrice = parseFloat(editProductForm.price);
          onEdit({
              ...editingProduct,
              reference: editProductForm.reference,
              name: editProductForm.name,
              price: isNaN(newPrice) ? undefined : newPrice
          });
          setEditingProduct(null);
      }
  }

  const deleteColorGroup = (productsInColor: Product[]) => {
      if(confirm(`Tem certeza? Isso excluirá ${productsInColor.length} registros.`)) {
          productsInColor.forEach(p => onDelete(p.id));
      }
  }

  const deleteSingleProduct = (p: Product) => {
      if(confirm(`Excluir referência ${p.reference}?`)) {
          onDelete(p.id);
      }
  }

  const addNewVariationToGroup = () => {
    if (!selectedGroup || !onAddProduct || selectedGroup.length === 0) return;
    
    const base = selectedGroup[0];
    const newProduct: Product = {
        id: crypto.randomUUID(),
        reference: base.reference, 
        name: `Nova Variação`,
        color: 'Nova Cor',
        colorHex: '#000000',
        imageUrl: base.imageUrl,
        description: base.description,
        stocks: {},
        totalStock: 0,
        price: base.price
    };

    onAddProduct([newProduct]);
  };

  // Helper to Render the Modal Content
  const renderGroupContent = () => {
    if (!selectedGroup || selectedGroup.length === 0) return <div className="p-4 text-center text-gray-500">Imagem sem produtos associados.</div>;

    const colorGroups: { [key: string]: Product[] } = {};
    selectedGroup.forEach(p => {
        const key = `${p.color.trim().toLowerCase()}-${p.colorHex}`;
        if (!colorGroups[key]) colorGroups[key] = [];
        colorGroups[key].push(p);
    });

    return (
        <div className="space-y-6">
            {Object.entries(colorGroups).map(([key, productsInColor]) => {
                const first = productsInColor[0];
                const colorKey = key;
                
                const mergedStocks: { [size: string]: number } = {};
                let totalStockInColor = 0;

                productsInColor.forEach(p => {
                    totalStockInColor += p.totalStock;
                    Object.entries(p.stocks).forEach(([size, qty]) => {
                        mergedStocks[size] = (mergedStocks[size] || 0) + qty;
                    });
                });

                // ADMIN ONLY: Hide if zero stock and toggle is ON
                if (isAdmin && hideZeroStock && totalStockInColor === 0) {
                    return null;
                }
                
                // PUBLIC CATALOG: Never hide whole color block unless completely zero (user preference override: show gray boxes)
                // Actually, user said "quando não tiver mais cor na referência... não ia aparecer... porém na tela de estoque aparece a grade com cor 0".
                // Later said: "só corrige mesmo quando não tiver mais itens no tamanho permanecer com 0 de estoque até zerar totalmente" -> meaning show 0.
                
                // So we render it.

                if (gridEditingColorKey === colorKey) {
                   return (
                     <div key={key} className="bg-white rounded-xl border-2 border-indigo-200 p-4 shadow-md">
                        {/* Grid Edit Logic Same as Before */}
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="font-bold text-indigo-700 flex items-center gap-2">
                             <Grid3X3 size={20} /> Editando Grade: {first.color}
                           </h4>
                           <div className="flex gap-2">
                             <button onClick={() => setGridEditingColorKey(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                             <button onClick={() => saveGridEditing(productsInColor)} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-bold">Salvar Alterações</button>
                           </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr>
                                <th className="text-left p-2 border-b bg-gray-50 text-gray-500 font-medium">Referência</th>
                                {SIZES.map(s => (
                                  <th key={s} className="p-2 border-b bg-gray-50 text-center font-bold text-gray-700 w-16">{s}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {productsInColor.map(p => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                                  <td className="p-2 font-mono font-medium text-gray-900">{p.reference}</td>
                                  {SIZES.map(s => {
                                    const val = gridState[p.id]?.[s];
                                    return (
                                      <td key={s} className="p-1">
                                        <input 
                                          type="text"
                                          value={val !== undefined ? val : ''}
                                          onChange={(e) => handleGridChange(p.id, s, e.target.value)}
                                          placeholder="0"
                                          className={`w-full text-center p-1.5 border rounded outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 ${
                                            (val && val > 0) ? 'bg-indigo-50 font-bold text-indigo-700' : 'bg-white'
                                          }`}
                                        />
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                     </div>
                   );
                }

                return (
                    <div key={key} className="bg-white rounded-xl border p-4 shadow-sm ring-1 ring-gray-100">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 border-b pb-3 border-dashed border-gray-100">
                            
                            {editingColorKey === colorKey ? (
                                <div className="flex-1 grid grid-cols-1 gap-3 p-3 bg-indigo-50 rounded-lg w-full">
                                    <h5 className="text-xs font-bold text-indigo-800 uppercase">Editar Cor</h5>
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            value={editForm.color}
                                            onChange={e => setEditForm({...editForm, color: e.target.value})}
                                            className="flex-1 p-2 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <input 
                                            type="color"
                                            value={editForm.colorHex}
                                            onChange={e => setEditForm({...editForm, colorHex: e.target.value})}
                                            className="h-9 w-12 rounded cursor-pointer border border-gray-300 bg-white p-0.5"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingColorKey(null)} className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-300 rounded">Cancelar</button>
                                        <button onClick={() => saveEditingColor(productsInColor)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded">Salvar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {first.colorHex && (
                                        <div className="w-10 h-10 rounded-full border shadow-sm shrink-0" style={{ backgroundColor: first.colorHex }} />
                                    )}
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg">{first.color}</h4>
                                        {isAdmin && (
                                             <div className="flex gap-2 mt-1">
                                                <button onClick={() => startEditingColor(colorKey, productsInColor)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1"><Edit2 size={10} /> Editar Cor</button>
                                                <button onClick={() => startGridEditing(colorKey, productsInColor)} className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded flex items-center gap-1 font-bold border border-indigo-100"><Grid3X3 size={10} /> Gerenciar Grade</button>
                                                <button onClick={() => deleteColorGroup(productsInColor)} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-0.5 rounded flex items-center gap-1"><Trash2 size={10} /> Excluir</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* References List */}
                            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Referências nesta cor</span>
                                <div className="flex flex-col gap-1 w-full sm:w-auto">
                                    {productsInColor.map(p => (
                                        <div key={p.id} className="flex items-center justify-between sm:justify-end gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                            
                                            {editingProduct?.id === p.id ? (
                                                <div className="flex items-center gap-1 animate-in fade-in">
                                                    <input 
                                                        value={editProductForm.reference}
                                                        onChange={e => setEditProductForm({...editProductForm, reference: e.target.value})}
                                                        className="w-16 p-1 text-xs border border-gray-300 bg-white rounded text-gray-900 outline-none"
                                                        placeholder="Ref"
                                                    />
                                                     <input 
                                                        value={editProductForm.name}
                                                        onChange={e => setEditProductForm({...editProductForm, name: e.target.value})}
                                                        className="w-24 p-1 text-xs border border-gray-300 bg-white rounded text-gray-900 outline-none"
                                                        placeholder="Nome"
                                                    />
                                                    <input 
                                                        value={editProductForm.price}
                                                        onChange={e => setEditProductForm({...editProductForm, price: e.target.value})}
                                                        className="w-16 p-1 text-xs border border-gray-300 bg-white rounded text-gray-900 outline-none"
                                                        placeholder="R$"
                                                        type="number"
                                                    />
                                                    <button onClick={saveEditingProduct} className="text-green-600 p-1 hover:bg-green-50 rounded"><Save size={12}/></button>
                                                    <button onClick={() => setEditingProduct(null)} className="text-gray-400 p-1 hover:bg-gray-200 rounded"><X size={12}/></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-xs font-mono font-medium text-gray-700">{p.reference}</span>
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                        {getGradeLabel(p.stocks)}
                                                    </span>
                                                    {p.price && (
                                                        <span className="text-xs font-bold text-green-600">R$ {p.price.toFixed(2)}</span>
                                                    )}
                                                    
                                                    {isAdmin && (
                                                        <div className="flex gap-1 ml-2 border-l pl-2 border-gray-200">
                                                            <button onClick={() => startEditingProduct(p)} className="text-blue-400 hover:text-blue-600 p-0.5"><Edit2 size={10} /></button>
                                                            {productsInColor.length > 1 && (
                                                                <button onClick={() => deleteSingleProduct(p)} className="text-gray-300 hover:text-red-500 p-0.5"><XCircle size={10} /></button>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Merged Stock Grid */}
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {SIZES.map(size => {
                                const qty = mergedStocks[size] || 0;
                                const hasStock = qty > 0;
                                
                                // CATALOG VIEW: Show as gray box if 0. Only hide if Admin hides it.
                                
                                return (
                                    <div key={size} className={`flex flex-col rounded border overflow-hidden ${hasStock ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                                        <div className="bg-gray-50 p-1 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                                            {size}
                                        </div>
                                        <div className="p-2 text-center relative group h-12 flex items-center justify-center">
                                            <span className={`font-bold ${hasStock ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                {qty}
                                            </span>

                                            {isAdmin && (
                                                <div className="absolute inset-0 bg-white flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openAdjustment(productsInColor, size, 'OUT')} className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center hover:bg-red-200"><Minus size={12}/></button>
                                                    <button onClick={() => openAdjustment(productsInColor, size, 'IN')} className="w-6 h-6 bg-green-100 text-green-600 rounded flex items-center justify-center hover:bg-green-200"><Plus size={12}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const getActiveAdjustStock = () => {
      if (!adjustingItem) return 0;
      const target = adjustingItem.candidates.find(p => p.id === adjustingItem.selectedProductId);
      return target?.stocks[adjustingItem.size] || 0;
  }

  const isValidTransaction = () => {
      if (!adjustingItem) return false;
      const val = typeof adjustQty === 'string' ? parseInt(adjustQty) : adjustQty;
      if (isNaN(val) || val <= 0) return false;
      if (adjustingItem.type === 'OUT') {
          return val <= getActiveAdjustStock();
      }
      return true;
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800">
            {isAdmin ? 'Gerenciamento de Estoque' : 'Catálogo'}
        </h2>
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, referência ou cor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full text-gray-900"
            />
        </div>
      </div>

      {/* Grid of Groups (Catalog View) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {productGroups.map((group, idx) => {
          const mainProduct = group[0];
          const totalStockInGroup = group.reduce((acc, p) => acc + p.totalStock, 0);
          const uniqueColors = new Set(group.map(p => `${p.color}-${p.colorHex}`)).size;
          const uniqueRefs = Array.from(new Set(group.map(p => p.reference)));
          const prices = group.map(p => p.price).filter(p => p !== undefined) as number[];
          const minPrice = prices.length ? Math.min(...prices) : null;
          const maxPrice = prices.length ? Math.max(...prices) : null;
          
          if (!isAdmin && totalStockInGroup === 0) return null;

          return (
            <div 
              key={mainProduct.imageUrl}
              onClick={() => setSelectedImageKey(mainProduct.imageUrl)}
              className="bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
            >
               <div className="h-72 bg-gray-100 relative overflow-hidden">
                 <img 
                    src={mainProduct.imageUrl} 
                    alt={mainProduct.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                 />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <button className="bg-white/90 text-indigo-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2">
                        Ver Detalhes <ChevronRight size={16}/>
                    </button>
                 </div>
                 {minPrice !== null && (
                     <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm font-bold shadow-sm">
                         {minPrice !== maxPrice 
                             ? `R$ ${minPrice.toFixed(0)} - ${maxPrice?.toFixed(0)}` 
                             : `R$ ${minPrice.toFixed(2)}`
                         }
                     </div>
                 )}
               </div>
               <div className="p-4">
                  <h3 className="font-bold text-gray-900 truncate">{mainProduct.name.split('-')[0]}</h3>
                  
                  <div className="flex flex-wrap gap-1 mt-1">
                      {uniqueRefs.map(ref => (
                          <span key={ref} className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                              {ref}
                          </span>
                      ))}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{uniqueColors} cores disponíveis</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${totalStockInGroup > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          Total: {totalStockInGroup}
                      </span>
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {productGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white rounded-xl border border-dashed">
          <Box className="w-12 h-12 mb-2 opacity-20" />
          <p>Nenhum produto encontrado.</p>
        </div>
      )}

      {/* Main Detail Modal */}
      {selectedGroup && selectedGroup.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              
              <div className="w-full md:w-1/3 bg-gray-100 relative md:h-auto h-64 shrink-0 border-r">
                  <img src={selectedGroup[0].imageUrl} alt="Product" className="w-full h-full object-contain bg-gray-50" />
                   <button onClick={() => setSelectedImageKey(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full md:hidden"><X size={20} /></button>
              </div>

              <div className="flex-1 flex flex-col h-full overflow-hidden">
                 <div className="p-6 border-b flex justify-between items-start bg-white z-10 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{selectedGroup[0].name.split('-')[0]}</h2>
                    </div>
                    <button onClick={() => setSelectedImageKey(null)} className="text-gray-400 hover:text-gray-600 hidden md:block hover:bg-gray-100 p-1 rounded-full transition-colors"><X size={24} /></button>
                 </div>

                 {isAdmin && (
                     <div className="bg-indigo-50 px-6 py-2 border-b flex justify-end">
                         <button 
                            onClick={() => setHideZeroStock(!hideZeroStock)}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                         >
                             {hideZeroStock ? <EyeOff size={14}/> : <Eye size={14}/>}
                             {hideZeroStock ? 'Exibindo apenas com estoque' : 'Exibindo todos os itens'}
                         </button>
                     </div>
                 )}

                 <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {renderGroupContent()}

                    {isAdmin && (
                        <div className="mt-8">
                            <button
                                onClick={addNewVariationToGroup}
                                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Adicionar Nova Cor ou Referência
                            </button>
                        </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Stock Adjustment Mini Modal */}
      {adjustingItem && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setAdjustingItem(null)}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl border p-6 w-96 animate-in zoom-in-95 duration-200 relative"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${adjustingItem.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
                        {adjustingItem.type === 'IN' ? <Plus size={20}/> : <Minus size={20}/>}
                        {adjustingItem.type === 'IN' ? 'Entrada de Estoque' : 'Baixa de Estoque'}
                    </h3>
                    <button onClick={() => setAdjustingItem(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" type="button"><XCircle size={20} /></button>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-700">
                    <p className="mb-1"><strong>Cor:</strong> {adjustingItem.colorName}</p>
                    <p><strong>Tamanho:</strong> <span className="bg-gray-200 px-2 py-0.5 rounded font-bold">{adjustingItem.size}</span></p>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                        <AlertCircle size={12}/> Selecione a Referência
                    </label>
                    <select
                        value={adjustingItem.selectedProductId}
                        onChange={e => setAdjustingItem({...adjustingItem, selectedProductId: e.target.value})}
                        className="w-full p-2.5 border border-indigo-200 bg-white rounded-lg text-sm text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {adjustingItem.candidates.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.reference} - {getGradeLabel(p.stocks)} ({p.stocks[adjustingItem.size] || 0} un.)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-4 mb-2 bg-white p-2 border rounded-lg justify-center">
                    <button 
                        type="button"
                        onClick={() => {
                            const val = typeof adjustQty === 'string' ? parseInt(adjustQty) || 0 : adjustQty;
                            setAdjustQty(Math.max(1, val - 1));
                        }}
                        className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                        <Minus size={20} />
                    </button>
                    
                    <input 
                        type="number"
                        value={adjustQty}
                        onChange={e => setAdjustQty(e.target.value)}
                        className="text-2xl font-bold w-20 text-center text-gray-900 border-none outline-none bg-white"
                        min="1"
                    />

                    <button 
                         type="button"
                         onClick={() => {
                             const val = typeof adjustQty === 'string' ? parseInt(adjustQty) || 0 : adjustQty;
                             setAdjustQty(val + 1);
                         }}
                         className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {adjustingItem.type === 'OUT' && (
                    <div className="mb-4 text-center">
                         {(typeof adjustQty === 'string' ? parseInt(adjustQty) : adjustQty) > getActiveAdjustStock() ? (
                             <p className="text-xs text-red-600 font-bold bg-red-50 p-1 rounded animate-pulse">
                                 Estoque insuficiente! Disponível: {getActiveAdjustStock()}
                             </p>
                         ) : (
                             <p className="text-xs text-gray-400">
                                 Disponível em estoque: {getActiveAdjustStock()}
                             </p>
                         )}
                    </div>
                )}


                {adjustingItem.type === 'OUT' && (
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                             <User size={12}/> Cliente (Opcional)
                        </label>
                        <select
                            value={selectedCustomer}
                            onChange={e => setSelectedCustomer(e.target.value)}
                            className="w-full p-2 border rounded text-sm bg-white text-gray-900"
                        >
                            <option value="">Não identificado</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                <button 
                    type="button"
                    onClick={handleAdjustSubmit}
                    disabled={!isValidTransaction()}
                    className={`w-full py-3 rounded-lg text-white font-bold shadow-lg transform active:scale-95 transition-all ${
                        isValidTransaction() 
                        ? (adjustingItem.type === 'IN' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600')
                        : 'bg-gray-300 cursor-not-allowed opacity-70'
                    }`}
                >
                    Confirmar {adjustingItem.type === 'IN' ? 'Entrada' : 'Baixa'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
