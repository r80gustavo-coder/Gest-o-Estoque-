
import React, { useState, useRef } from 'react';
import { Camera, Loader2, Save, Plus, Trash2, Grid, Layers, DollarSign } from 'lucide-react';
import { Product } from '../types';

interface ProductFormProps {
  onSave: (products: Product[]) => void;
  onCancel: () => void;
}

type GridType = 'PADRAO' | 'PLUS';

interface ReferenceConfig {
  id: string;
  code: string;
  type: GridType;
  price: string;
}

interface ColorEntry {
  id: string;
  name: string;
  hex: string;
  // Map: configId -> { size -> quantity }
  stocks: { [configId: string]: { [size: string]: string } };
}

const ProductForm: React.FC<ProductFormProps> = ({ onSave, onCancel }) => {
  // 1. General Info
  const [imageUrl, setImageUrl] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // 2. Configuration (References defined BEFORE adding colors)
  const [refConfigs, setRefConfigs] = useState<ReferenceConfig[]>([
    { id: '1', code: '', type: 'PADRAO', price: '' }
  ]);

  // 3. Colors (The matrix)
  const [colors, setColors] = useState<ColorEntry[]>([
    { id: '1', name: '', hex: '#000000', stocks: {} }
  ]);

  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const getSizesForType = (type: GridType) => {
    if (type === 'PLUS') return ['G1', 'G2', 'G3'];
    return ['P', 'M', 'G', 'GG'];
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             resolve(canvas.toDataURL('image/jpeg', 0.7)); 
          } else {
             reject(new Error("Canvas context failed"));
          }
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Handlers ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedBase64 = await resizeImage(file);
        setImageUrl(compressedBase64);
      } catch (err) {
        console.error("Compression error", err);
        alert("Erro ao processar imagem.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  // --- Reference Configuration Logic ---
  const addRefConfig = () => {
    setRefConfigs([...refConfigs, { id: crypto.randomUUID(), code: '', type: 'PADRAO', price: '' }]);
  };

  const removeRefConfig = (id: string) => {
    if (refConfigs.length > 1) {
      setRefConfigs(refConfigs.filter(rc => rc.id !== id));
    }
  };

  const updateRefConfig = (id: string, field: keyof ReferenceConfig, value: any) => {
    setRefConfigs(refConfigs.map(rc => rc.id === id ? { ...rc, [field]: value } : rc));
  };

  // --- Color & Stock Logic ---
  const addColor = () => {
    setColors([...colors, { id: crypto.randomUUID(), name: '', hex: '#000000', stocks: {} }]);
  };

  const removeColor = (id: string) => {
    if (colors.length > 1) {
      setColors(colors.filter(c => c.id !== id));
    }
  };

  const updateColor = (id: string, field: keyof ColorEntry, value: any) => {
    setColors(colors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateStock = (colorId: string, configId: string, size: string, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setColors(prev => prev.map(c => {
        if (c.id !== colorId) return c;
        
        const currentStocksForConfig = c.stocks[configId] || {};
        return {
          ...c,
          stocks: {
            ...c.stocks,
            [configId]: {
              ...currentStocksForConfig,
              [size]: value
            }
          }
        };
      }));
    }
  };

  // --- Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert("Adicione uma foto.");
      return;
    }

    const productsToSave: Product[] = [];
    const validationErrors: string[] = [];

    // Validations
    refConfigs.forEach(rc => {
      if (!rc.code.trim()) validationErrors.push("Preencha todos os códigos de referência.");
    });
    colors.forEach(c => {
      if (!c.name.trim()) validationErrors.push("Preencha os nomes das cores.");
    });

    if (validationErrors.length > 0) {
      alert(validationErrors[0]);
      return;
    }

    // Flatten Data: Color -> RefConfig -> Product
    colors.forEach(color => {
      refConfigs.forEach(config => {
        const stocksForThisRef = color.stocks[config.id] || {};
        const finalStocks: { [key: string]: number } = {};
        let totalStock = 0;

        Object.entries(stocksForThisRef).forEach(([size, qtyStr]) => {
            const qty = parseInt(qtyStr as string);
            if (!isNaN(qty) && qty > 0) {
                finalStocks[size] = qty;
                totalStock += qty;
            }
        });
        
        const configPrice = config.price ? parseFloat(config.price.replace(',', '.')) : undefined;

        productsToSave.push({
            id: crypto.randomUUID(),
            reference: config.code,
            name: productName || `Peça ${color.name}`,
            color: color.name,
            colorHex: color.hex,
            imageUrl: imageUrl,
            description: description,
            stocks: finalStocks,
            totalStock: totalStock,
            price: configPrice
        });
      });
    });

    if (productsToSave.length > 0) {
      onSave(productsToSave);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Cadastrar Peças</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: VISUAL & BASIC INFO */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
             <div className="flex flex-col md:flex-row gap-6">
                {/* Image Upload */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center relative overflow-hidden bg-white transition-colors ${imageUrl ? 'border-indigo-500' : 'border-gray-300 hover:border-indigo-400'}`}>
                         {isCompressing ? (
                            <div className="flex flex-col items-center text-indigo-500">
                                <Loader2 className="animate-spin mb-2" />
                                <span className="text-xs">Processando...</span>
                            </div>
                        ) : imageUrl ? (
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center p-4">
                                <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">Adicionar Foto</p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Info Inputs */}
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Geral do Modelo</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            className="w-full p-2.5 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ex: Vestido Longo Floral"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Comercial</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-2.5 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Descrição manual..."
                        />
                    </div>
                </div>
             </div>
        </div>

        {/* SECTION 2: REFERENCE CONFIGURATION */}
        <div className="bg-white p-5 rounded-xl border-2 border-indigo-50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Layers size={20} className="text-indigo-600"/> 
                    1. Definição de Referências e Preços
                </h3>
                <button type="button" onClick={addRefConfig} className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1">
                    <Plus size={16}/> Adicionar Outra Referência
                </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
                Configure as referências (Padrão ou Plus Size) e seus respectivos preços.
            </p>

            <div className="space-y-3">
                {refConfigs.map((rc, idx) => (
                    <div key={rc.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1 w-full sm:w-auto">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Referência (Cód.)</label>
                            <input 
                                type="text"
                                value={rc.code}
                                onChange={e => updateRefConfig(rc.id, 'code', e.target.value)}
                                className="w-full p-2 border rounded text-gray-900 font-mono font-medium bg-white"
                                placeholder={`Ex: ${idx === 0 ? '643' : '644'}`}
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Grade</label>
                            <select
                                value={rc.type}
                                onChange={e => updateRefConfig(rc.id, 'type', e.target.value)}
                                className="w-full p-2 border rounded text-gray-900 bg-white"
                            >
                                <option value="PADRAO">Padrão (P ao GG)</option>
                                <option value="PLUS">Plus Size (G1 ao G3)</option>
                            </select>
                        </div>
                        <div className="w-full sm:w-40 relative">
                             <label className="block text-xs font-bold text-gray-500 mb-1">Preço (R$)</label>
                             <div className="relative">
                                <DollarSign size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={rc.price}
                                    onChange={e => updateRefConfig(rc.id, 'price', e.target.value)}
                                    className="w-full p-2 pl-7 border rounded text-gray-900 font-bold bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="0.00"
                                />
                             </div>
                        </div>
                        {refConfigs.length > 1 && (
                            <button 
                                type="button" 
                                onClick={() => removeRefConfig(rc.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded bg-white border border-gray-200"
                                title="Remover Referência"
                            >
                                <Trash2 size={18}/>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* SECTION 3: COLOR MATRIX */}
        <div className="bg-white p-5 rounded-xl border-2 border-indigo-50">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Grid size={20} className="text-indigo-600"/> 
                    2. Cores e Estoque
                </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
                Adicione as cores. A grade de estoque será gerada automaticamente com base nas referências acima.
            </p>

            <div className="space-y-6">
                {colors.map((color, idx) => (
                    <div key={color.id} className="bg-white border rounded-xl shadow-sm overflow-hidden ring-1 ring-gray-200">
                        {/* Color Header */}
                        <div className="bg-gray-50 p-3 border-b flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
                            <div className="flex gap-3 w-full sm:w-auto">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">NOME DA COR</label>
                                    <input
                                        type="text"
                                        value={color.name}
                                        onChange={e => updateColor(color.id, 'name', e.target.value)}
                                        className="p-2 border rounded w-full sm:w-48 text-gray-900 font-bold bg-white"
                                        placeholder="Ex: Azul Marinho"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">HEX</label>
                                    <input
                                        type="color"
                                        value={color.hex}
                                        onChange={e => updateColor(color.id, 'hex', e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded border p-0.5 bg-white"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => removeColor(color.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>

                        {/* Stock Matrix for this Color */}
                        <div className="p-4 bg-white space-y-4">
                             {refConfigs.map(config => (
                                 <div key={config.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b last:border-0 pb-4 last:pb-0 border-dashed border-gray-100">
                                    <div className="w-24 shrink-0">
                                        <span className="block text-xs font-bold text-indigo-600">Ref: {config.code || '???'}</span>
                                        <span className="text-[10px] text-gray-400 uppercase block">{config.type}</span>
                                        {config.price && <span className="text-[10px] text-green-600 font-bold block">R$ {config.price}</span>}
                                    </div>
                                    
                                    <div className="flex-1 grid grid-cols-4 sm:grid-cols-7 gap-2 w-full">
                                        {getSizesForType(config.type).map(size => (
                                            <div key={size}>
                                                <label className="block text-[10px] text-center text-gray-400 mb-0.5">{size}</label>
                                                <input 
                                                    type="text"
                                                    placeholder="0"
                                                    value={color.stocks[config.id]?.[size] || ''}
                                                    onChange={e => updateStock(color.id, config.id, size, e.target.value)}
                                                    className={`w-full text-center p-1.5 border rounded text-sm text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500 ${
                                                        (color.stocks[config.id]?.[size] && parseInt(color.stocks[config.id]?.[size]!) > 0)
                                                        ? 'bg-indigo-50 border-indigo-200 font-bold text-indigo-700'
                                                        : 'bg-white'
                                                    }`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addColor}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Adicionar Nova Cor
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white p-4 -mx-6 -mb-6 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
             <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 flex items-center space-x-2 transition-all"
            >
              <Save size={18} />
              <span>Salvar Produtos</span>
            </button>
        </div>

      </form>
    </div>
  );
};

export default ProductForm;
