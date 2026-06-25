import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileText,
  HelpCircle,
  Home,
  Lock,
  PackageCheck,
  PlusCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  Warehouse,
} from 'lucide-react';
import {
  initialCustomers,
  initialProducts,
  initialTransactions,
  navItems,
  roles,
  salesSeries,
  today,
} from './data.js';

const navIcons = {
  home: Home,
  purchase: Warehouse,
  sale: ShoppingCart,
  inventory: Boxes,
  receivables: WalletCards,
  collection: CircleDollarSign,
  stocktake: ClipboardCheck,
  transfer: ArrowLeftRight,
  reports: BarChart3,
  permissions: ShieldCheck,
};

const productFields = [
  '品牌',
  '品名',
  '规格',
  '单位',
  '条码',
  '批次',
  '生产日期',
  '保质期',
  '供应商',
  '进价',
  '售价',
  '当前库存',
  '预警',
  '仓库',
];

const moduleTitles = {
  home: '经营首页',
  purchase: '采购入库',
  sale: '销售出库',
  inventory: '库存管理',
  receivables: '客户欠款',
  collection: '收款',
  stocktake: '盘点报损',
  transfer: '库存调拨',
  reports: '经营报表',
  permissions: '权限',
};

const priceTiers = ['批发价', '渠道价', '零售价'];
const customerTypes = ['烟酒店', '餐饮', '个人'];
const operationTypes = ['采购入库', '销售退货', '调拨', '盘点', '报损'];

function useLocalStore(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function money(value) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function plainMoney(value) {
  return Number(value || 0).toFixed(2);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function customerPrice(product, tier) {
  if (!product) return 0;
  if (tier === '批发价') return Math.round(product.price * 0.92);
  if (tier === '渠道价') return Math.round(product.price * 0.96);
  return product.price;
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function App() {
  const [roleKey, setRoleKey] = useState('owner');
  const [activeModule, setActiveModule] = useState('home');
  const [products, setProducts] = useLocalStore('jiucangtung.products', initialProducts);
  const [customers, setCustomers] = useLocalStore('jiucangtung.customers', initialCustomers);
  const [transactions, setTransactions] = useLocalStore('jiucangtung.transactions', initialTransactions);
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('全部品牌');
  const [warehouseFilter, setWarehouseFilter] = useState('全部仓库');
  const [alertOnly, setAlertOnly] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(initialProducts[0].id);
  const [saleProductId, setSaleProductId] = useState(initialProducts[0].id);
  const [saleQty, setSaleQty] = useState(1);
  const [saleDraft, setSaleDraft] = useState({
    customerId: 'c-001',
    type: '烟酒店',
    priceTier: '批发价',
    paid: 0,
    note: '',
    deliveryAddress: '',
  });
  const [draftLines, setDraftLines] = useState([
    { productId: 'p-001', qty: 2, price: 3018 },
    { productId: 'p-002', qty: 2, price: 1287 },
    { productId: 'p-003', qty: 2, price: 1194 },
  ]);
  const [operation, setOperation] = useState({
    type: '采购入库',
    productId: 'p-001',
    qty: 1,
    countedStock: 1,
    amount: '',
    party: '',
    targetWarehouse: '成都总仓',
    customerId: 'c-001',
    note: '',
  });
  const [collection, setCollection] = useState({ customerId: 'c-001', amount: 10000, method: '银行转账', note: '' });
  const [printOrder, setPrintOrder] = useState(null);
  const importInputRef = useRef(null);

  const role = roles[roleKey];
  const allowed = useMemo(() => new Set(role.permissions), [role.permissions]);

  useEffect(() => {
    if (!allowed.has(activeModule)) setActiveModule('home');
  }, [activeModule, allowed]);

  const selectedCustomer = customers.find((customer) => customer.id === saleDraft.customerId) || customers[0];

  useEffect(() => {
    if (!selectedCustomer) return;
    setSaleDraft((draft) => ({
      ...draft,
      type: selectedCustomer.type,
      priceTier: selectedCustomer.priceTier,
      deliveryAddress: selectedCustomer.address,
    }));
  }, [selectedCustomer?.id]);

  const brands = useMemo(() => ['全部品牌', ...Array.from(new Set(products.map((product) => product.brand)))], [products]);
  const warehouses = useMemo(
    () => ['全部仓库', ...Array.from(new Set(products.map((product) => product.warehouse)))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesTerm =
        !term ||
        [product.brand, product.name, product.barcode, product.batch, product.supplier]
          .join(' ')
          .toLowerCase()
          .includes(term);
      const matchesBrand = brandFilter === '全部品牌' || product.brand === brandFilter;
      const matchesWarehouse = warehouseFilter === '全部仓库' || product.warehouse === warehouseFilter;
      const matchesAlert = !alertOnly || product.stock <= product.alert;
      return matchesTerm && matchesBrand && matchesWarehouse && matchesAlert;
    });
  }, [alertOnly, brandFilter, products, query, warehouseFilter]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || products[0];
  const saleProduct = products.find((product) => product.id === saleProductId) || products[0];

  useEffect(() => {
    if (visibleProducts.length && !visibleProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(visibleProducts[0].id);
    }
  }, [selectedProductId, visibleProducts]);

  const stats = useMemo(() => {
    const inventoryValue = products.reduce((sum, product) => sum + product.cost * product.stock, 0);
    const todayOutbound = transactions
      .filter((transaction) => transaction.type === '销售出库' && transaction.date === today)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const receivable = customers.reduce((sum, customer) => sum + customer.receivable, 0);
    const lowStock = products.filter((product) => product.stock <= product.alert).length;
    return { inventoryValue, todayOutbound, receivable, lowStock };
  }, [customers, products, transactions]);

  const draftTotal = draftLines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const draftPaid = Number(saleDraft.paid || 0);
  const draftDebt = Math.max(draftTotal - draftPaid, 0);
  const canUseActiveModule = allowed.has(activeModule);

  function exportProducts() {
    const rows = products.map((product) => [
      product.brand,
      product.name,
      product.spec,
      product.unit,
      product.barcode,
      product.batch,
      product.productionDate,
      product.shelfLife,
      product.supplier,
      product.cost,
      product.price,
      product.stock,
      product.alert,
      product.warehouse,
    ]);
    const csv = [productFields, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `酒仓通库存-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importProducts(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(headerLine);
    const indexByHeader = Object.fromEntries(headers.map((header, index) => [header, index]));
    const nextProducts = lines.map((line) => {
      const cells = parseCsvLine(line);
      return {
        id: makeId('p'),
        brand: cells[indexByHeader['品牌']] || '',
        name: cells[indexByHeader['品名']] || '',
        spec: cells[indexByHeader['规格']] || '',
        unit: cells[indexByHeader['单位']] || '瓶',
        barcode: cells[indexByHeader['条码']] || '',
        batch: cells[indexByHeader['批次']] || '',
        productionDate: cells[indexByHeader['生产日期']] || today,
        shelfLife: cells[indexByHeader['保质期']] || '长期',
        supplier: cells[indexByHeader['供应商']] || '',
        cost: Number(cells[indexByHeader['进价']] || 0),
        price: Number(cells[indexByHeader['售价']] || 0),
        stock: Number(cells[indexByHeader['当前库存']] || 0),
        alert: Number(cells[indexByHeader['预警']] || 0),
        warehouse: cells[indexByHeader['仓库']] || '成都总仓',
      };
    });
    if (nextProducts.length) {
      setProducts(nextProducts);
      setSelectedProductId(nextProducts[0].id);
      setSaleProductId(nextProducts[0].id);
    }
    event.target.value = '';
  }

  function addSaleLine() {
    if (!allowed.has('sale')) return;
    const qty = Math.max(1, Number(saleQty || 1));
    const price = customerPrice(saleProduct, saleDraft.priceTier);
    setDraftLines((lines) => {
      const existing = lines.find((line) => line.productId === saleProduct.id);
      if (existing) {
        return lines.map((line) => (line.productId === saleProduct.id ? { ...line, qty: line.qty + qty, price } : line));
      }
      return [...lines, { productId: saleProduct.id, qty, price }];
    });
  }

  function removeSaleLine(productId) {
    setDraftLines((lines) => lines.filter((line) => line.productId !== productId));
  }

  function saveSale(printAfterSave = false) {
    if (!allowed.has('sale')) return;
    if (!selectedCustomer || draftLines.length === 0) return;

    const shortage = draftLines.find((line) => {
      const product = products.find((item) => item.id === line.productId);
      return !product || line.qty > product.stock;
    });
    if (shortage) {
      const product = products.find((item) => item.id === shortage.productId);
      window.alert(`${product?.name || '商品'}库存不足，当前库存 ${product?.stock || 0}`);
      return;
    }

    const orderNo = `XSCKD-${today.replaceAll('-', '')}-${String(transactions.length + 1).padStart(3, '0')}`;
    const orderLines = draftLines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return { ...line, product, amount: line.qty * line.price };
    });
    const order = {
      orderNo,
      date: today,
      customer: selectedCustomer,
      address: saleDraft.deliveryAddress,
      note: saleDraft.note,
      lines: orderLines,
      total: draftTotal,
      paid: draftPaid,
      debt: draftDebt,
    };

    setProducts((items) =>
      items.map((product) => {
        const line = draftLines.find((item) => item.productId === product.id);
        return line ? { ...product, stock: product.stock - line.qty } : product;
      }),
    );
    setCustomers((items) =>
      items.map((customer) =>
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              receivable: Number((customer.receivable + draftDebt).toFixed(2)),
              overdueDays: draftDebt > 0 ? Math.max(customer.overdueDays, 1) : customer.overdueDays,
            }
          : customer,
      ),
    );
    setTransactions((items) => [
      ...orderLines.map((line) => ({
        id: makeId('t'),
        type: '销售出库',
        date: today,
        party: selectedCustomer.name,
        productName: line.product.name,
        qty: line.qty,
        amount: line.amount,
        status: draftDebt > 0 ? '挂账' : '已收款',
      })),
      ...items,
    ]);
    setPrintOrder(order);
    setDraftLines([]);
    setSaleDraft((draft) => ({ ...draft, paid: 0, note: '' }));
    if (printAfterSave) {
      window.setTimeout(() => window.print(), 80);
    }
  }

  function applyOperation(event) {
    event.preventDefault();
    if (!canUseActiveModule) return;

    const product = products.find((item) => item.id === operation.productId);
    if (!product && operation.type !== '收款') return;
    const qty = Math.max(1, Number(operation.qty || 1));
    const countedStock = Math.max(0, Number(operation.countedStock || 0));
    const amount = Number(operation.amount || qty * (operation.type === '采购入库' ? product.cost : product.price));

    if (operation.type === '采购入库') {
      setProducts((items) => items.map((item) => (item.id === product.id ? { ...item, stock: item.stock + qty } : item)));
    }

    if (operation.type === '销售退货') {
      const customer = customers.find((item) => item.id === operation.customerId);
      setProducts((items) => items.map((item) => (item.id === product.id ? { ...item, stock: item.stock + qty } : item)));
      if (customer) {
        setCustomers((items) =>
          items.map((item) =>
            item.id === customer.id ? { ...item, receivable: Math.max(0, Number((item.receivable - amount).toFixed(2))) } : item,
          ),
        );
      }
    }

    if (operation.type === '调拨') {
      setProducts((items) =>
        items.map((item) => (item.id === product.id ? { ...item, warehouse: operation.targetWarehouse } : item)),
      );
    }

    if (operation.type === '盘点') {
      setProducts((items) => items.map((item) => (item.id === product.id ? { ...item, stock: countedStock } : item)));
    }

    if (operation.type === '报损') {
      setProducts((items) =>
        items.map((item) => (item.id === product.id ? { ...item, stock: Math.max(0, item.stock - qty) } : item)),
      );
    }

    setTransactions((items) => [
      {
        id: makeId('t'),
        type: operation.type,
        date: today,
        party: operation.party || operation.targetWarehouse,
        productName: product.name,
        qty: operation.type === '盘点' ? countedStock : qty,
        amount,
        status: operation.type === '采购入库' ? '已入库' : '已确认',
      },
      ...items,
    ]);
  }

  function applyCollection(event) {
    event.preventDefault();
    if (!allowed.has('collection')) return;
    const customer = customers.find((item) => item.id === collection.customerId);
    const amount = Math.max(0, Number(collection.amount || 0));
    if (!customer || amount <= 0) return;

    setCustomers((items) =>
      items.map((item) =>
        item.id === customer.id
          ? { ...item, receivable: Math.max(0, Number((item.receivable - amount).toFixed(2))), overdueDays: amount >= item.receivable ? 0 : item.overdueDays }
          : item,
      ),
    );
    setTransactions((items) => [
      {
        id: makeId('t'),
        type: '收款',
        date: today,
        party: customer.name,
        productName: collection.method,
        qty: 1,
        amount,
        status: '已核销',
      },
      ...items,
    ]);
  }

  function resetDemoData() {
    const confirmed = window.confirm('恢复演示数据会覆盖当前本地数据，是否继续？');
    if (!confirmed) return;
    setProducts(initialProducts);
    setCustomers(initialCustomers);
    setTransactions(initialTransactions);
    setDraftLines([
      { productId: 'p-001', qty: 2, price: 3018 },
      { productId: 'p-002', qty: 2, price: 1287 },
      { productId: 'p-003', qty: 2, price: 1194 },
    ]);
    setSelectedProductId(initialProducts[0].id);
    setSaleProductId(initialProducts[0].id);
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar role={role} allowed={allowed} activeModule={activeModule} onChange={setActiveModule} />
        <div className="main-shell">
          <TopBar
            roleKey={roleKey}
            setRoleKey={setRoleKey}
            activeModule={activeModule}
            lowStockCount={stats.lowStock}
            resetDemoData={resetDemoData}
          />
          <main className="content-grid">
            <section className="workspace">
              <KpiStrip stats={stats} />
              {['home', 'inventory', 'sale'].includes(activeModule) ? (
                <InventoryWorkspace
                  activeModule={activeModule}
                  products={products}
                  visibleProducts={visibleProducts}
                  selectedProductId={selectedProductId}
                  setSelectedProductId={setSelectedProductId}
                  query={query}
                  setQuery={setQuery}
                  brands={brands}
                  brandFilter={brandFilter}
                  setBrandFilter={setBrandFilter}
                  warehouses={warehouses}
                  warehouseFilter={warehouseFilter}
                  setWarehouseFilter={setWarehouseFilter}
                  alertOnly={alertOnly}
                  setAlertOnly={setAlertOnly}
                  exportProducts={exportProducts}
                  importProducts={importProducts}
                  importInputRef={importInputRef}
                />
              ) : null}
              {['purchase', 'stocktake', 'transfer'].includes(activeModule) ? (
                <OperationPanel
                  activeModule={activeModule}
                  operation={operation}
                  setOperation={setOperation}
                  products={products}
                  customers={customers}
                  warehouses={warehouses.filter((item) => item !== '全部仓库')}
                  onSubmit={applyOperation}
                />
              ) : null}
              {activeModule === 'receivables' || activeModule === 'collection' ? (
                <ReceivablesPanel
                  activeModule={activeModule}
                  customers={customers}
                  collection={collection}
                  setCollection={setCollection}
                  onSubmit={applyCollection}
                  allowed={allowed}
                />
              ) : null}
              {activeModule === 'reports' ? (
                <ReportsPanel products={products} customers={customers} transactions={transactions} stats={stats} />
              ) : null}
              {activeModule === 'permissions' ? <PermissionPanel roleKey={roleKey} /> : null}
            </section>
            <RightRail
              allowed={allowed}
              products={products}
              customers={customers}
              selectedCustomer={selectedCustomer}
              saleProductId={saleProductId}
              setSaleProductId={setSaleProductId}
              saleQty={saleQty}
              setSaleQty={setSaleQty}
              saleDraft={saleDraft}
              setSaleDraft={setSaleDraft}
              draftLines={draftLines}
              draftTotal={draftTotal}
              draftDebt={draftDebt}
              addSaleLine={addSaleLine}
              removeSaleLine={removeSaleLine}
              saveSale={saveSale}
            />
          </main>
        </div>
      </div>
      <DeliveryNote order={printOrder} />
    </>
  );
}

function Sidebar({ role, allowed, activeModule, onChange }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Building2 size={22} />
        </div>
        <span>酒仓通</span>
      </div>
      <nav className="nav-list" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = navIcons[item.id];
          const canAccess = allowed.has(item.id);
          return (
            <button
              className={`nav-item ${activeModule === item.id ? 'is-active' : ''} ${canAccess ? '' : 'is-locked'}`}
              type="button"
              key={item.id}
              onClick={() => canAccess && onChange(item.id)}
              disabled={!canAccess}
              title={canAccess ? item.label : `${role.label}暂无权限`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {!canAccess ? <Lock size={14} /> : null}
            </button>
          );
        })}
      </nav>
      <button className="collapse-button" type="button">
        <ChevronDown size={18} />
        <span>收起</span>
      </button>
    </aside>
  );
}

function TopBar({ roleKey, setRoleKey, activeModule, lowStockCount, resetDemoData }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <button className="icon-button" type="button" aria-label="菜单">
          <Boxes size={18} />
        </button>
        <div className="crumb-button">
          <Home size={16} />
          <span>{moduleTitles[activeModule]}</span>
        </div>
      </div>
      <div className="top-actions">
        <select className="role-select" value={roleKey} onChange={(event) => setRoleKey(event.target.value)}>
          {Object.entries(roles).map(([key, role]) => (
            <option key={key} value={key}>
              {role.label}
            </option>
          ))}
        </select>
        <button className="icon-button has-dot" type="button" aria-label="库存预警">
          <Bell size={18} />
          <span>{lowStockCount}</span>
        </button>
        <button className="icon-button" type="button" aria-label="帮助">
          <HelpCircle size={18} />
        </button>
        <button className="ghost-button compact" type="button" onClick={resetDemoData}>
          <RotateCcw size={16} />
          重置
        </button>
        <div className="user-chip">
          <span className="avatar">
            <UserRound size={16} />
          </span>
          <span>{roles[roleKey].user}</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}

function KpiStrip({ stats }) {
  const cards = [
    { label: '库存金额', value: money(stats.inventoryValue), sub: '较昨日 +2.35%', icon: CircleDollarSign, tone: 'wine' },
    { label: '今日出库', value: money(stats.todayOutbound), sub: '单据 23 笔', icon: PackageCheck, tone: 'teal' },
    { label: '应收欠款', value: money(stats.receivable), sub: '客户 36 家', icon: WalletCards, tone: 'amber' },
    { label: '库存预警', value: stats.lowStock, sub: `商品 ${stats.lowStock} 种`, icon: AlertTriangle, tone: 'red' },
  ];
  return (
    <div className="kpi-strip">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className="kpi" key={card.label}>
            <div className={`kpi-icon ${card.tone}`}>
              <Icon size={22} />
            </div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.sub}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function InventoryWorkspace(props) {
  return (
    <div className="surface inventory-surface">
      <InventoryToolbar {...props} />
      <InventoryTable
        products={props.visibleProducts}
        selectedProductId={props.selectedProductId}
        setSelectedProductId={props.setSelectedProductId}
      />
      <div className="table-footer">
        <span>共 {props.visibleProducts.length} 条</span>
        <div className="pagination">
          <button type="button" disabled>
            20条/页
          </button>
          <button type="button" className="is-active">
            1
          </button>
          <button type="button">2</button>
          <button type="button">3</button>
          <span>...</span>
          <button type="button">13</button>
        </div>
      </div>
    </div>
  );
}

function InventoryToolbar({
  activeModule,
  query,
  setQuery,
  brands,
  brandFilter,
  setBrandFilter,
  warehouses,
  warehouseFilter,
  setWarehouseFilter,
  alertOnly,
  setAlertOnly,
  exportProducts,
  importProducts,
  importInputRef,
}) {
  return (
    <div className="inventory-toolbar">
      <div className="toolbar-title">
        <h1>{moduleTitles[activeModule]}</h1>
        <span>酒品批次、库存和价格</span>
      </div>
      <div className="filters">
        <select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
          {warehouses.map((warehouse) => (
            <option key={warehouse}>{warehouse}</option>
          ))}
        </select>
        <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
          {brands.map((brand) => (
            <option key={brand}>{brand}</option>
          ))}
        </select>
        <label className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="品名/条码/批次" />
        </label>
        <button className="primary-button" type="button">
          搜索
        </button>
        <button className="ghost-button" type="button" onClick={() => setQuery('')}>
          重置
        </button>
      </div>
      <div className="table-actions">
        <label className="checkline">
          <input type="checkbox" checked={alertOnly} onChange={(event) => setAlertOnly(event.target.checked)} />
          仅看预警
        </label>
        <input ref={importInputRef} className="hidden-file" type="file" accept=".csv" onChange={importProducts} />
        <button className="ghost-button compact" type="button" onClick={() => importInputRef.current?.click()}>
          <Upload size={15} />
          导入
        </button>
        <button className="ghost-button compact" type="button" onClick={exportProducts}>
          <Download size={15} />
          导出
        </button>
        <button className="ghost-button compact" type="button">
          <Settings2 size={15} />
          列设置
        </button>
      </div>
    </div>
  );
}

function InventoryTable({ products, selectedProductId, setSelectedProductId }) {
  return (
    <div className="table-wrap">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" aria-label="全选" />
            </th>
            <th>品牌</th>
            <th>品名</th>
            <th>规格</th>
            <th>单位</th>
            <th>条码</th>
            <th>批次</th>
            <th>生产日期</th>
            <th>保质期</th>
            <th>供应商</th>
            <th>进价</th>
            <th>售价</th>
            <th>当前库存</th>
            <th>预警</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const low = product.stock <= product.alert;
            return (
              <tr
                key={product.id}
                className={`${selectedProductId === product.id ? 'is-selected' : ''} ${low ? 'is-low' : ''}`}
                onClick={() => setSelectedProductId(product.id)}
              >
                <td>
                  <input type="checkbox" aria-label={`选择${product.name}`} />
                </td>
                <td>{product.brand}</td>
                <td className="strong-cell">{product.name}</td>
                <td>{product.spec}</td>
                <td>{product.unit}</td>
                <td>{product.barcode}</td>
                <td>{product.batch}</td>
                <td>{product.productionDate}</td>
                <td>{product.shelfLife}</td>
                <td>{product.supplier}</td>
                <td>{money(product.cost)}</td>
                <td>{money(product.price)}</td>
                <td>{product.stock}</td>
                <td>{low ? <span className="status low">低</span> : <span className="muted">-</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OperationPanel({ activeModule, operation, setOperation, products, customers, warehouses, onSubmit }) {
  const allowedTypes =
    activeModule === 'purchase'
      ? ['采购入库']
      : activeModule === 'transfer'
        ? ['调拨']
        : ['销售退货', '盘点', '报损'];
  const selectedProduct = products.find((product) => product.id === operation.productId) || products[0];

  useEffect(() => {
    if (!allowedTypes.includes(operation.type)) {
      setOperation((current) => ({ ...current, type: allowedTypes[0] }));
    }
  }, [allowedTypes, operation.type, setOperation]);

  return (
    <div className="surface operation-surface">
      <div className="section-head">
        <div>
          <h1>{moduleTitles[activeModule]}</h1>
          <span>单据会实时更新库存和流水</span>
        </div>
        <span className="doc-no">DJ-{today.replaceAll('-', '')}-001</span>
      </div>
      <form className="operation-grid" onSubmit={onSubmit}>
        <label>
          单据类型
          <select value={operation.type} onChange={(event) => setOperation({ ...operation, type: event.target.value })}>
            {operationTypes
              .filter((type) => allowedTypes.includes(type))
              .map((type) => (
                <option key={type}>{type}</option>
              ))}
          </select>
        </label>
        <label>
          商品
          <select value={operation.productId} onChange={(event) => setOperation({ ...operation, productId: event.target.value })}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.brand} {product.name}
              </option>
            ))}
          </select>
        </label>
        {operation.type !== '盘点' ? (
          <label>
            数量
            <input
              type="number"
              min="1"
              value={operation.qty}
              onChange={(event) => setOperation({ ...operation, qty: event.target.value })}
            />
          </label>
        ) : (
          <label>
            盘点库存
            <input
              type="number"
              min="0"
              value={operation.countedStock}
              onChange={(event) => setOperation({ ...operation, countedStock: event.target.value })}
            />
          </label>
        )}
        <label>
          往来方
          {operation.type === '销售退货' ? (
            <select value={operation.customerId} onChange={(event) => setOperation({ ...operation, customerId: event.target.value })}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={operation.party}
              onChange={(event) => setOperation({ ...operation, party: event.target.value })}
              placeholder={operation.type === '采购入库' ? selectedProduct.supplier : '仓库/经办人'}
            />
          )}
        </label>
        {operation.type === '调拨' ? (
          <label>
            调入仓库
            <select value={operation.targetWarehouse} onChange={(event) => setOperation({ ...operation, targetWarehouse: event.target.value })}>
              {warehouses.map((warehouse) => (
                <option key={warehouse}>{warehouse}</option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            金额
            <input
              type="number"
              min="0"
              value={operation.amount}
              onChange={(event) => setOperation({ ...operation, amount: event.target.value })}
              placeholder={plainMoney(selectedProduct.cost * Number(operation.qty || 1))}
            />
          </label>
        )}
        <label className="wide-field">
          备注
          <input value={operation.note} onChange={(event) => setOperation({ ...operation, note: event.target.value })} />
        </label>
        <div className="operation-summary">
          <div>
            <span>当前库存</span>
            <strong>{selectedProduct.stock}</strong>
          </div>
          <div>
            <span>库存预警</span>
            <strong>{selectedProduct.alert}</strong>
          </div>
          <div>
            <span>所在仓库</span>
            <strong>{selectedProduct.warehouse}</strong>
          </div>
        </div>
        <button className="primary-button form-submit" type="submit">
          <CheckCircle2 size={16} />
          保存单据
        </button>
      </form>
    </div>
  );
}

function ReceivablesPanel({ activeModule, customers, collection, setCollection, onSubmit, allowed }) {
  const selectedCustomer = customers.find((customer) => customer.id === collection.customerId) || customers[0];
  return (
    <div className="surface receivable-surface">
      <div className="section-head">
        <div>
          <h1>{moduleTitles[activeModule]}</h1>
          <span>客户授信、逾期天数和收款核销</span>
        </div>
        <strong>{money(customers.reduce((sum, customer) => sum + customer.receivable, 0))}</strong>
      </div>
      {activeModule === 'collection' ? (
        <form className="collection-form" onSubmit={onSubmit}>
          <label>
            客户
            <select value={collection.customerId} onChange={(event) => setCollection({ ...collection, customerId: event.target.value })}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            本次收款
            <input
              type="number"
              min="0"
              value={collection.amount}
              onChange={(event) => setCollection({ ...collection, amount: event.target.value })}
            />
          </label>
          <label>
            收款方式
            <select value={collection.method} onChange={(event) => setCollection({ ...collection, method: event.target.value })}>
              <option>银行转账</option>
              <option>微信</option>
              <option>支付宝</option>
              <option>现金</option>
            </select>
          </label>
          <label>
            备注
            <input value={collection.note} onChange={(event) => setCollection({ ...collection, note: event.target.value })} />
          </label>
          <div className="collection-balance">
            <span>{selectedCustomer.name} 当前欠款</span>
            <strong>{money(selectedCustomer.receivable)}</strong>
          </div>
          <button className="primary-button" type="submit" disabled={!allowed.has('collection')}>
            <CheckCircle2 size={16} />
            核销收款
          </button>
        </form>
      ) : null}
      <div className="customer-table-wrap">
        <table className="customer-table">
          <thead>
            <tr>
              <th>客户名称</th>
              <th>类型</th>
              <th>客户价</th>
              <th>联系人</th>
              <th>欠款</th>
              <th>逾期</th>
              <th>授信</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="strong-cell">{customer.name}</td>
                <td>{customer.type}</td>
                <td>{customer.priceTier}</td>
                <td>{customer.contact}</td>
                <td className={customer.receivable > 0 ? 'money-red' : ''}>{money(customer.receivable)}</td>
                <td>{customer.overdueDays ? `${customer.overdueDays}天` : '-'}</td>
                <td>{money(customer.creditLimit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPanel({ products, customers, transactions, stats }) {
  const topProducts = [...products].sort((a, b) => b.stock * b.cost - a.stock * a.cost).slice(0, 5);
  const recent = transactions.slice(0, 7);
  return (
    <div className="reports-grid">
      <div className="surface report-panel">
        <div className="section-head">
          <div>
            <h1>销售趋势</h1>
            <span>近7天金额</span>
          </div>
          <strong>{money(stats.todayOutbound)}</strong>
        </div>
        <TrendChart />
      </div>
      <div className="surface report-panel">
        <div className="section-head">
          <div>
            <h1>库存金额 TOP5</h1>
            <span>按成本金额排序</span>
          </div>
          <Boxes size={22} />
        </div>
        <ul className="rank-list">
          {topProducts.map((product) => (
            <li key={product.id}>
              <span>{product.brand} {product.name}</span>
              <strong>{money(product.stock * product.cost)}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="surface report-panel">
        <div className="section-head">
          <div>
            <h1>客户欠款 TOP5</h1>
            <span>按欠款金额排序</span>
          </div>
          <WalletCards size={22} />
        </div>
        <ReceivableMiniList customers={customers} />
      </div>
      <div className="surface report-panel">
        <div className="section-head">
          <div>
            <h1>最近流水</h1>
            <span>入库、出库、收款、报损</span>
          </div>
          <FileText size={22} />
        </div>
        <ul className="timeline-list">
          {recent.map((item) => (
            <li key={item.id}>
              <span>{item.date}</span>
              <strong>{item.type}</strong>
              <em>{item.party}</em>
              <b>{money(item.amount)}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PermissionPanel({ roleKey }) {
  return (
    <div className="surface permission-surface">
      <div className="section-head">
        <div>
          <h1>角色权限</h1>
          <span>老板、仓库、销售、财务分工</span>
        </div>
        <ShieldCheck size={24} />
      </div>
      <div className="permission-grid">
        <div className="permission-header">模块</div>
        {Object.entries(roles).map(([key, role]) => (
          <div className={`permission-header ${roleKey === key ? 'is-current' : ''}`} key={key}>
            {role.label}
          </div>
        ))}
        {navItems.map((item) => (
          <Fragment key={item.id}>
            <div className="permission-name">
              {item.label}
            </div>
            {Object.entries(roles).map(([key, role]) => (
              <div className="permission-cell" key={`${item.id}-${key}`}>
                {role.permissions.includes(item.id) ? <CheckCircle2 size={18} /> : <Lock size={16} />}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function RightRail({
  allowed,
  products,
  customers,
  selectedCustomer,
  saleProductId,
  setSaleProductId,
  saleQty,
  setSaleQty,
  saleDraft,
  setSaleDraft,
  draftLines,
  draftTotal,
  draftDebt,
  addSaleLine,
  removeSaleLine,
  saveSale,
}) {
  return (
    <aside className="right-rail">
      <div className="surface sales-panel">
        <div className="rail-head">
          <div>
            <h2>销售出库单</h2>
            <span>XSCKD-{today.replaceAll('-', '')}-001</span>
          </div>
          <button className="link-button" type="button" disabled={!allowed.has('sale')}>
            新建单据
            <PlusCircle size={15} />
          </button>
        </div>
        <div className="form-stack">
          <label>
            客户名称
            <select value={saleDraft.customerId} onChange={(event) => setSaleDraft({ ...saleDraft, customerId: event.target.value })}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <div className="segmented">
            {customerTypes.map((type) => (
              <button
                key={type}
                className={saleDraft.type === type ? 'is-active' : ''}
                type="button"
                onClick={() => setSaleDraft({ ...saleDraft, type })}
              >
                {type}
              </button>
            ))}
          </div>
          <label>
            客户价格
            <select value={saleDraft.priceTier} onChange={(event) => setSaleDraft({ ...saleDraft, priceTier: event.target.value })}>
              {priceTiers.map((tier) => (
                <option key={tier}>{tier}</option>
              ))}
            </select>
          </label>
          <div className="debt-line">
            <span>原欠款</span>
            <strong>{money(selectedCustomer?.receivable || 0)}</strong>
          </div>
          <label>
            送货地址
            <input value={saleDraft.deliveryAddress} onChange={(event) => setSaleDraft({ ...saleDraft, deliveryAddress: event.target.value })} />
          </label>
          <label>
            送货备注
            <input value={saleDraft.note} onChange={(event) => setSaleDraft({ ...saleDraft, note: event.target.value })} placeholder="请输入送货备注" />
          </label>
        </div>
        <div className="line-adder">
          <select value={saleProductId} onChange={(event) => setSaleProductId(event.target.value)}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} / 库存{product.stock}
              </option>
            ))}
          </select>
          <input type="number" min="1" value={saleQty} onChange={(event) => setSaleQty(event.target.value)} />
          <button className="ghost-button compact" type="button" onClick={addSaleLine} disabled={!allowed.has('sale')}>
            添加
          </button>
        </div>
        <div className="draft-table">
          <div className="draft-head">
            <span>商品明细 ({draftLines.length})</span>
            <span>选择商品</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>商品</th>
                <th>数量</th>
                <th>单价</th>
                <th>金额</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draftLines.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                if (!product) return null;
                return (
                  <tr key={line.productId}>
                    <td>{product.name}</td>
                    <td>{line.qty}</td>
                    <td>{money(line.price)}</td>
                    <td>{money(line.price * line.qty)}</td>
                    <td>
                      <button className="mini-icon" type="button" onClick={() => removeSaleLine(line.productId)}>
                        x
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="draft-total">
            <span>合计</span>
            <strong>{money(draftTotal)}</strong>
          </div>
          <label className="paid-field">
            本次收款
            <input type="number" min="0" value={saleDraft.paid} onChange={(event) => setSaleDraft({ ...saleDraft, paid: event.target.value })} />
          </label>
          <div className="debt-line">
            <span>本单挂账</span>
            <strong>{money(draftDebt)}</strong>
          </div>
          <div className="draft-actions">
            <button className="primary-button" type="button" onClick={() => saveSale(true)} disabled={!allowed.has('sale')}>
              <Printer size={16} />
              保存并打印
            </button>
            <button className="ghost-button" type="button" onClick={() => saveSale(false)} disabled={!allowed.has('sale')}>
              <Save size={16} />
              保存
            </button>
          </div>
        </div>
      </div>
      <div className="surface chart-panel">
        <div className="rail-head compact-head">
          <h2>销售趋势</h2>
          <div className="small-tabs">
            <button className="is-active" type="button">
              金额
            </button>
            <button type="button">单据数</button>
          </div>
        </div>
        <TrendChart />
      </div>
      <div className="surface overdue-panel">
        <div className="rail-head compact-head">
          <h2>逾期应收款 TOP 5</h2>
        </div>
        <ReceivableMiniList customers={customers} />
      </div>
    </aside>
  );
}

function TrendChart() {
  const max = Math.max(...salesSeries.map((point) => point.amount));
  const points = salesSeries.map((point, index) => {
    const x = 24 + index * 51;
    const y = 120 - (point.amount / max) * 86;
    return `${x},${y}`;
  });
  const area = `24,126 ${points.join(' ')} 330,126`;
  return (
    <div className="trend-chart">
      <svg viewBox="0 0 354 150" role="img" aria-label="销售趋势折线图">
        <defs>
          <linearGradient id="wineArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a01828" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#a01828" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 70, 100, 130].map((y) => (
          <line key={y} x1="14" x2="340" y1={y} y2={y} className="grid-line" />
        ))}
        <polygon points={area} fill="url(#wineArea)" />
        <polyline points={points.join(' ')} className="trend-line" />
        {salesSeries.map((point, index) => {
          const [x, y] = points[index].split(',');
          return (
            <g key={point.day}>
              <circle cx={x} cy={y} r="3.8" className="trend-dot" />
              <text x={x} y="143" textAnchor="middle">
                {point.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ReceivableMiniList({ customers }) {
  return (
    <ul className="receivable-mini">
      {[...customers]
        .sort((a, b) => b.receivable - a.receivable)
        .slice(0, 5)
        .map((customer) => (
          <li key={customer.id}>
            <span>{customer.name}</span>
            <em>{customer.overdueDays}天</em>
            <strong>{money(customer.receivable)}</strong>
          </li>
        ))}
    </ul>
  );
}

function DeliveryNote({ order }) {
  if (!order) return null;
  return (
    <div className="print-sheet">
      <h1>酒仓通送货单</h1>
      <div className="print-meta">
        <span>单号：{order.orderNo}</span>
        <span>日期：{order.date}</span>
        <span>客户：{order.customer.name}</span>
        <span>地址：{order.address}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>规格</th>
            <th>数量</th>
            <th>单价</th>
            <th>金额</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.product.id}>
              <td>{line.product.name}</td>
              <td>{line.product.spec}</td>
              <td>{line.qty}</td>
              <td>{money(line.price)}</td>
              <td>{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-total">
        <span>合计：{money(order.total)}</span>
        <span>已收：{money(order.paid)}</span>
        <span>挂账：{money(order.debt)}</span>
      </div>
      <div className="print-sign">
        <span>送货人：</span>
        <span>客户签收：</span>
      </div>
    </div>
  );
}

export default App;
