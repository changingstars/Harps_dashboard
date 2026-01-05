import React, { useState } from 'react';
import { Package, ShoppingCart, Clock, CheckCircle, Plus, Search, Menu, X, FileText } from 'lucide-react';

const SempermedDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([
    { id: 'ORD-001', date: '2026-01-03', status: 'pending', items: 3, total: 245000 },
    { id: 'ORD-002', date: '2026-01-02', status: 'completed', items: 5, total: 390000 },
    { id: 'ORD-003', date: '2025-12-28', status: 'pending', items: 2, total: 156000 },
  ]);
  
  const [products] = useState([
    { 
      id: 1, 
      name: 'Sempermed Black Pearl',
      category: 'Nitril kesztyű',
      sizes: [
        { size: 'S', price: 14500, stock: 320 },
        { size: 'M', price: 14500, stock: 280 },
        { size: 'L', price: 14500, stock: 250 },
        { size: 'XL', price: 14500, stock: 190 }
      ]
    },
    { 
      id: 2, 
      name: 'Sempermed Latex',
      category: 'Latex kesztyű',
      sizes: [
        { size: 'S', price: 9800, stock: 420 },
        { size: 'M', price: 9800, stock: 450 },
        { size: 'L', price: 9800, stock: 380 },
        { size: 'XL', price: 9800, stock: 340 }
      ]
    },
    { 
      id: 3, 
      name: 'Sempermed Supreme',
      category: 'Nitril kesztyű',
      sizes: [
        { size: 'S', price: 12500, stock: 220 },
        { size: 'M', price: 12500, stock: 250 },
        { size: 'L', price: 12500, stock: 200 },
        { size: 'XL', price: 12500, stock: 180 }
      ]
    },
    { 
      id: 4, 
      name: 'Sempermed Syntegra',
      category: 'Nitril kesztyű',
      sizes: [
        { size: 'S', price: 13200, stock: 160 },
        { size: 'M', price: 13200, stock: 180 },
        { size: 'L', price: 13200, stock: 150 },
        { size: 'XL', price: 13200, stock: 140 }
      ]
    },
    { 
      id: 5, 
      name: 'Sempermed Vinyl',
      category: 'Vinyl kesztyű',
      sizes: [
        { size: 'S', price: 7500, stock: 490 },
        { size: 'M', price: 7500, stock: 520 },
        { size: 'L', price: 7500, stock: 480 },
        { size: 'XL', price: 7500, stock: 450 }
      ]
    },
    { 
      id: 6, 
      name: 'Semperguard Nitrile',
      category: 'Nitril kesztyű',
      sizes: [
        { size: 'S', price: 11900, stock: 200 },
        { size: 'M', price: 11900, stock: 210 },
        { size: 'L', price: 11900, stock: 190 },
        { size: 'XL', price: 11900, stock: 180 }
      ]
    },
  ].sort((a, b) => a.name.localeCompare(b.name)));

  const [orderSheet, setOrderSheet] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const addOrderLine = (product, size, quantity) => {
    const sizeData = product.sizes.find(s => s.size === size);
    const newLine = {
      id: Date.now(),
      productName: product.name,
      category: product.category,
      size: size,
      quantity: quantity,
      price: sizeData.price,
      total: sizeData.price * quantity
    };
    setOrderSheet([...orderSheet, newLine]);
  };

  const removeOrderLine = (lineId) => {
    setOrderSheet(orderSheet.filter(line => line.id !== lineId));
  };

  const updateOrderLine = (lineId, field, value) => {
    setOrderSheet(orderSheet.map(line => {
      if (line.id === lineId) {
        const updated = { ...line, [field]: value };
        if (field === 'quantity') {
          updated.total = updated.price * value;
        }
        return updated;
      }
      return line;
    }));
  };

  const submitOrder = () => {
    if (orderSheet.length === 0) return;
    
    const newOrder = {
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      items: orderSheet.length,
      total: orderSheet.reduce((sum, line) => sum + line.total, 0)
    };
    
    setOrders([newOrder, ...orders]);
    setOrderSheet([]);
    setActiveTab('orders');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const orderTotal = orderSheet.reduce((sum, line) => sum + line.total, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="font-bold text-gray-900">Sempermed</span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Áttekintés', icon: Package },
              { id: 'products', label: 'Portfólió', icon: Package },
              { id: 'new-order', label: 'Új rendelés', icon: FileText },
              { id: 'orders', label: 'Rendelések', icon: Clock },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {sidebarOpen && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Függőben lévő</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{pendingOrders}</p>
                    </div>
                    <Clock className="w-12 h-12 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Összes rendelés</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{orders.length}</p>
                    </div>
                    <Package className="w-12 h-12 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Termékek</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{products.length}</p>
                    </div>
                    <Package className="w-12 h-12 text-green-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legutóbbi rendelések</h3>
                <div className="space-y-3">
                  {orders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${order.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`} />
                        <div>
                          <p className="font-semibold text-gray-900">{order.id}</p>
                          <p className="text-sm text-gray-600">{order.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{order.total.toLocaleString()} Ft</p>
                        <p className="text-sm text-gray-600">{order.items} tétel</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Termék Portfólió</h2>
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Keresés..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Termék név</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategória</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méretek és árak</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Készlet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">{product.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 flex-wrap">
                              {product.sizes.map(sizeData => (
                                <div key={sizeData.size} className="bg-blue-50 px-3 py-1 rounded-lg text-sm">
                                  <span className="font-semibold text-blue-900">{sizeData.size}:</span>
                                  <span className="text-blue-700 ml-1">{sizeData.price.toLocaleString()} Ft</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {product.sizes.map(sizeData => (
                                <div key={sizeData.size} className="text-sm">
                                  <span className="text-gray-600">{sizeData.size}:</span>
                                  <span className={`ml-2 font-medium ${sizeData.stock > 200 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {sizeData.stock} db
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* New Order Tab */}
          {activeTab === 'new-order' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Új rendelés lap</h2>
                <button
                  onClick={() => setOrderSheet([])}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Lap törlése
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Termék hozzáadása</h3>
                  <div className="space-y-4">
                    {products.map(product => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="font-semibold text-gray-900 mb-2">{product.name}</div>
                        <div className="text-sm text-gray-600 mb-3">{product.category}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {product.sizes.map(sizeData => (
                            <button
                              key={sizeData.size}
                              onClick={() => addOrderLine(product, sizeData.size, 1)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-900 px-3 py-2 rounded-lg text-sm transition-colors"
                            >
                              <div className="font-semibold">{sizeData.size}</div>
                              <div className="text-xs">{sizeData.price.toLocaleString()} Ft</div>
                              <div className="text-xs text-blue-600">Készlet: {sizeData.stock}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Sheet */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendelési lap</h3>
                  
                  {orderSheet.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Üres rendelési lap</p>
                      <p className="text-sm mt-1">Adj hozzá termékeket a rendeles leadásához</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                        {orderSheet.map((line, index) => (
                          <div key={line.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 text-center text-sm text-gray-500">{index + 1}.</div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">{line.productName}</div>
                              <div className="text-xs text-gray-600">Méret: {line.size} | {line.price.toLocaleString()} Ft/db</div>
                            </div>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateOrderLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                            <div className="w-32 text-right font-semibold text-gray-900">
                              {line.total.toLocaleString()} Ft
                            </div>
                            <button
                              onClick={() => removeOrderLine(line.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tételek száma:</span>
                          <span className="font-semibold text-gray-900">{orderSheet.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Összes mennyiség:</span>
                          <span className="font-semibold text-gray-900">
                            {orderSheet.reduce((sum, line) => sum + line.quantity, 0)} db
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-lg font-bold text-gray-900">Végösszeg:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {orderTotal.toLocaleString()} Ft
                          </span>
                        </div>
                        <button
                          onClick={submitOrder}
                          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold mt-4"
                        >
                          Rendelés leadása
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Rendelések</h2>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rendelésszám</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dátum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Státusz</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tételek</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Összeg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{order.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{order.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                              order.status === 'pending' 
                                ? 'bg-orange-100 text-orange-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {order.status === 'pending' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              {order.status === 'pending' ? 'Függőben' : 'Teljesítve'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{order.items}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                            {order.total.toLocaleString()} Ft
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SempermedDashboard;