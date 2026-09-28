import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Product } from '@/types/product';
import { productService } from '@/services/productService';

type CategoryFilter = 'Todos' | string;
type StatusFilter = 'Todos' | 'Activos' | 'Inactivos';
type PendingStatusChange = { product: Product; action: 'deactivate' | 'restore' };

const palette = {
  ink: '#20234A',
  muted: '#9298AE',
  green: '#16825B',
  greenSoft: '#E9F8F0',
  greenDark: '#0D6B4A',
  canvas: '#F7F8FC',
  line: '#EEF0F6',
  mint: '#31947C',
  mintSoft: '#E5F7F2',
};

const cardColors = ['#E5F7F2', '#E9F8F0', '#FFF0CE', '#EAF1FF', '#FFF0F1'];

function productInitials(product: Product) {
  const words = product.product_name.split(' ');
  return words.length >= 2
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : product.product_name.substring(0, 2).toUpperCase();
}

function formatPrice(price: number) {
  return `S/ ${Number(price).toFixed(2)}`;
}

function StatCard({ icon, label, value, tint }: { icon: string; label: string; value: number | string; tint: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <ThemedText style={styles.statIconText}>{icon}</ThemedText>
      </View>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusChangeBusy, setStatusChangeBusy] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState('');

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
      setError(false);
    } catch (fetchError) {
      console.error('Error fetching products', fetchError);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  const activeCount = products.filter(p => p.is_active !== false).length;
  const inactiveCount = products.length - activeCount;
  const totalStock = products.reduce((sum, p) => sum + (p.current_stock || 0), 0);
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category_name).filter(Boolean));
    return ['Todos', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return products.filter(product => {
      const matchesSearch = !normalizedSearch || [
        product.product_name,
        product.category_name,
        product.product_code,
        product.variety,
        product.description,
      ].some(value => value?.toLocaleLowerCase().includes(normalizedSearch));
      const isActive = product.is_active !== false;
      const matchesStatus = statusFilter === 'Todos' || (statusFilter === 'Activos' ? isActive : !isActive);
      const matchesCategory = categoryFilter === 'Todos' || product.category_name === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const askStatusChange = (product: Product, action: PendingStatusChange['action']) => {
    setStatusChangeError('');
    setPendingStatusChange({ product, action });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange?.product.id) return;
    setStatusChangeBusy(true);
    setStatusChangeError('');
    try {
      if (pendingStatusChange.action === 'deactivate') {
        await productService.delete(pendingStatusChange.product.id);
      } else {
        await productService.restore(pendingStatusChange.product.id);
      }
      setPendingStatusChange(null);
      await fetchProducts(true);
    } catch (statusError) {
      console.error(`Error ${pendingStatusChange.action}ing product`, statusError);
      setStatusChangeError('No se pudo actualizar el estado. Revisa la conexión e inténtalo otra vez.');
    } finally {
      setStatusChangeBusy(false);
    }
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => (
    <View style={styles.productCard}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: cardColors[index % cardColors.length] }]}>
          <ThemedText style={styles.avatarText}>{productInitials(item)}</ThemedText>
        </View>
        <View style={styles.productMain}>
          <View style={styles.nameLine}>
            <ThemedText numberOfLines={1} style={styles.productName}>{item.product_name}</ThemedText>
            <View style={styles.categoryBadge}>
              <ThemedText style={styles.categoryBadgeText}>{item.category_name}</ThemedText>
            </View>
          </View>
          {!!item.variety && (
            <ThemedText numberOfLines={1} style={styles.varietyText}>
              Variedad: {item.variety}
            </ThemedText>
          )}
          <View style={styles.statusLine}>
            <View style={[styles.statusDot, item.is_active === false && styles.inactiveDot]} />
            <ThemedText style={[styles.statusText, item.is_active === false && styles.inactiveText]}>
              {item.is_active === false ? 'Inactivo' : 'Activo'}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.detailsBlock}>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Precio:</ThemedText>
          <ThemedText style={styles.priceText}>{formatPrice(item.sale_price)}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <ThemedText style={styles.detailLabel}>Stock:</ThemedText>
          <ThemedText style={[styles.stockText, item.current_stock <= 5 && styles.lowStockText]}>
            {item.current_stock} unidades {item.current_stock <= 5 ? '⚠' : ''}
          </ThemedText>
        </View>
        {!!item.growth_stage && (
          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Etapa:</ThemedText>
            <ThemedText style={styles.detailValue}>{item.growth_stage}</ThemedText>
          </View>
        )}
        {!!item.product_code && (
          <ThemedText style={styles.codeText}>Código: {item.product_code}</ThemedText>
        )}
      </View>

      <View style={styles.cardActions}>
        <Pressable
          accessibilityRole="button"
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => setSelectedProduct(item)}
        >
          <ThemedText style={styles.viewActionText}>⌕  Ver</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/products/${item.id}`)}
        >
          <ThemedText style={styles.editActionText}>↗  Editar</ThemedText>
        </Pressable>
        {item.is_active === false ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Restaurar ${item.product_name}`}
            style={styles.restoreButton}
            onPress={() => askStatusChange(item, 'restore')}
          >
            <ThemedText style={styles.restoreActionText}>↻  Restaurar</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${item.product_name}`}
            style={styles.deleteButton}
            onPress={() => askStatusChange(item, 'deactivate')}
          >
            <ThemedText style={styles.deleteActionText}>🗑 Eliminar</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Volver" onPress={() => router.push('/')} style={styles.backButton}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <ThemedText style={styles.headerTitle}>Productos</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{products.length} productos registrados</ThemedText>
          </View>
          <Pressable accessibilityRole="button" style={styles.newButton} onPress={() => router.push('/products/create')}>
            <ThemedText style={styles.newButtonText}>＋ Nuevo</ThemedText>
          </Pressable>
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) => item.id ?? `product-${index}`}
          renderItem={renderProduct}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} tintColor={palette.green} />}
          ListHeaderComponent={(
            <View>
              <View style={styles.statsRow}>
                <StatCard icon="♟" label="Total" value={products.length} tint="#DDF6EA" />
                <StatCard icon="✓" label="Activos" value={activeCount} tint="#E5F7F2" />
                <StatCard icon="☰" label="Stock" value={totalStock} tint="#FFF1D0" />
                <StatCard icon="▣" label="Categorías" value={categories.length - 1} tint="#EAF1FF" />
              </View>

              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <ThemedText style={styles.searchIcon}>⌕</ThemedText>
                  <TextInput
                    accessibilityLabel="Buscar productos"
                    placeholder="Buscar por nombre, código, categoría..."
                    placeholderTextColor={palette.muted}
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} hitSlop={10}>
                      <ThemedText style={styles.clearSearch}>×</ThemedText>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mostrar filtros"
                  style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                  onPress={() => setShowFilters(value => !value)}
                >
                  <ThemedText style={[styles.filterIcon, showFilters && styles.filterIconActive]}>☷</ThemedText>
                </Pressable>
              </View>

              {showFilters && (
                <View style={styles.filterPanel}>
                  <ThemedText style={styles.filterLabel}>Categoría</ThemedText>
                  <View style={styles.chipRow}>
                    {categories.map(cat => (
                      <Pressable key={cat} onPress={() => setCategoryFilter(cat)} style={[styles.filterChip, categoryFilter === cat && styles.filterChipSelected]}>
                        <ThemedText style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextSelected]}>{cat}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <ThemedText style={styles.filterLabel}>Estado</ThemedText>
                  <View style={styles.chipRow}>
                    {(['Todos', 'Activos', 'Inactivos'] as StatusFilter[]).map(filter => (
                      <Pressable key={filter} onPress={() => setStatusFilter(filter)} style={[styles.filterChip, statusFilter === filter && styles.filterChipSelected]}>
                        <ThemedText style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextSelected]}>{filter}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.resultsRow}>
                <ThemedText style={styles.resultsText}>{filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}</ThemedText>
                <View style={styles.quickFilters}>
                  {(['Todos', 'Activos', 'Inactivos'] as StatusFilter[]).map(filter => (
                    <Pressable key={filter} onPress={() => setStatusFilter(filter)} style={[styles.quickChip, statusFilter === filter && styles.quickChipSelected]}>
                      <ThemedText style={[styles.quickChipText, statusFilter === filter && styles.quickChipTextSelected]}>
                        {filter === 'Inactivos' ? `Inactivos ${inactiveCount}` : filter}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              {loading ? <ActivityIndicator size="large" color={palette.green} /> : (
                <>
                  <View style={styles.emptyIcon}><ThemedText style={styles.emptyIconText}>{error ? '!' : '⌕'}</ThemedText></View>
                  <ThemedText style={styles.emptyTitle}>{error ? 'No se pudo cargar' : 'No encontramos productos'}</ThemedText>
                  <ThemedText style={styles.emptyDescription}>
                    {error ? 'Revisa tu conexión e inténtalo otra vez.' : search ? 'Prueba con otro nombre o código.' : 'Registra tu primer producto para verlo aquí.'}
                  </ThemedText>
                  {error && <Pressable onPress={() => fetchProducts()} style={styles.retryButton}><ThemedText style={styles.retryText}>Intentar de nuevo</ThemedText></Pressable>}
                </>
              )}
            </View>
          )}
        />
      </SafeAreaView>

      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']}>
        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => router.push('/')}>
            <ThemedText style={styles.navIcon}>⊞</ThemedText><ThemedText style={styles.navLabel}>Inicio</ThemedText>
          </Pressable>
          <View style={styles.navItem}><ThemedText style={styles.navIcon}>▤</ThemedText><ThemedText style={styles.navLabel}>Pedidos</ThemedText></View>
          <View style={styles.navItem}>
            <View style={styles.activeNavIcon}><ThemedText style={styles.activeNavIconText}>☰</ThemedText></View>
            <ThemedText style={styles.activeNavLabel}>Productos</ThemedText><View style={styles.navDot} />
          </View>
          <View style={styles.navItem}><ThemedText style={styles.navIcon}>▧</ThemedText><ThemedText style={styles.navLabel}>Reportes</ThemedText></View>
        </View>
      </SafeAreaView>

      {/* Detail Modal */}
      <Modal visible={selectedProduct !== null} transparent animationType="fade" onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModal}>
            <View style={styles.modalTopLine}>
              <ThemedText style={styles.modalTitle}>Detalle del producto</ThemedText>
              <Pressable onPress={() => setSelectedProduct(null)} hitSlop={10} style={styles.modalClose}>
                <ThemedText style={styles.modalCloseText}>×</ThemedText>
              </Pressable>
            </View>
            {!!selectedProduct && <>
              <View style={styles.modalIdentity}>
                <View style={[styles.avatar, styles.modalAvatar]}><ThemedText style={styles.avatarText}>{productInitials(selectedProduct)}</ThemedText></View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.modalName}>{selectedProduct.product_name}</ThemedText>
                  <ThemedText style={styles.varietyText}>{selectedProduct.category_name}{selectedProduct.variety ? ` · ${selectedProduct.variety}` : ''}</ThemedText>
                </View>
              </View>
              <View style={styles.detailDivider} />
              <ThemedText style={styles.modalDetailLabel}>CÓDIGO</ThemedText>
              <ThemedText style={styles.modalDetailValue}>{selectedProduct.product_code || 'Sin código'}</ThemedText>
              <ThemedText style={styles.modalDetailLabel}>PRECIO DE VENTA</ThemedText>
              <ThemedText style={styles.modalDetailValue}>{formatPrice(selectedProduct.sale_price)}</ThemedText>
              <ThemedText style={styles.modalDetailLabel}>STOCK ACTUAL</ThemedText>
              <ThemedText style={styles.modalDetailValue}>{selectedProduct.current_stock} unidades</ThemedText>
              <ThemedText style={styles.modalDetailLabel}>ETAPA DE CRECIMIENTO</ThemedText>
              <ThemedText style={styles.modalDetailValue}>{selectedProduct.growth_stage || 'No especificada'}</ThemedText>
              {selectedProduct.plant_height != null && <>
                <ThemedText style={styles.modalDetailLabel}>ALTURA DE PLANTA</ThemedText>
                <ThemedText style={styles.modalDetailValue}>{selectedProduct.plant_height} cm</ThemedText>
              </>}
              {!!selectedProduct.description && <>
                <ThemedText style={styles.modalDetailLabel}>DESCRIPCIÓN</ThemedText>
                <ThemedText style={styles.modalDetailValue}>{selectedProduct.description}</ThemedText>
              </>}
              <Pressable style={styles.modalEditButton} onPress={() => { const pid = selectedProduct.id; setSelectedProduct(null); if (pid) router.push(`/products/${pid}`); }}>
                <ThemedText style={styles.modalEditText}>Editar producto</ThemedText>
              </Pressable>
            </>}
          </View>
        </View>
      </Modal>

      {/* Confirm status change Modal */}
      <Modal visible={pendingStatusChange !== null} transparent animationType="fade" onRequestClose={() => !statusChangeBusy && setPendingStatusChange(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmIcon, pendingStatusChange?.action === 'restore' && styles.confirmIconRestore]}>
              <ThemedText style={[styles.confirmIconText, pendingStatusChange?.action === 'restore' && styles.confirmIconTextRestore]}>
                {pendingStatusChange?.action === 'restore' ? '↻' : '🗑'}
              </ThemedText>
            </View>
            <ThemedText style={styles.confirmTitle}>
              {pendingStatusChange?.action === 'restore' ? 'Restaurar producto' : 'Mover a inactivos'}
            </ThemedText>
            <ThemedText style={styles.confirmDescription}>
              {pendingStatusChange?.action === 'restore'
                ? 'Volverá a aparecer entre tus productos activos.'
                : 'El producto quedará inactivo. Puedes restaurarlo después desde el filtro de estado.'}
            </ThemedText>
            {!!pendingStatusChange?.product && (
              <View style={styles.confirmProduct}>
                <View style={styles.confirmAvatar}><ThemedText style={styles.confirmAvatarText}>{productInitials(pendingStatusChange.product)}</ThemedText></View>
                <ThemedText numberOfLines={1} style={styles.confirmProductName}>
                  {pendingStatusChange.product.product_name}
                </ThemedText>
              </View>
            )}
            {!!statusChangeError && <ThemedText style={styles.confirmError}>{statusChangeError}</ThemedText>}
            <View style={styles.confirmActions}>
              <Pressable disabled={statusChangeBusy} onPress={() => setPendingStatusChange(null)} style={styles.confirmCancel}>
                <ThemedText style={styles.confirmCancelText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={statusChangeBusy}
                onPress={confirmStatusChange}
                style={[styles.confirmSubmit, pendingStatusChange?.action === 'restore' && styles.confirmSubmitRestore, statusChangeBusy && styles.confirmSubmitBusy]}
              >
                {statusChangeBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <ThemedText style={styles.confirmSubmitText}>
                    {pendingStatusChange?.action === 'restore' ? 'Sí, restaurar' : 'Sí, desactivar'}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: {
    minHeight: 74, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: palette.line,
  },
  backButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#E5F7F2', alignItems: 'center', justifyContent: 'center' },
  backText: { color: palette.green, fontSize: 29, lineHeight: 31, marginTop: -3 },
  headerTitleBlock: { flex: 1, alignItems: 'center', marginLeft: 6 },
  headerTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  headerSubtitle: { color: palette.muted, fontSize: 10, marginTop: 3 },
  newButton: { backgroundColor: palette.green, paddingHorizontal: 13, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  newButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  listContent: { paddingHorizontal: 14, paddingBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 11 },
  statCard: { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF5', borderRadius: 16, alignItems: 'center', paddingVertical: 9 },
  statIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statIconText: { fontSize: 12, color: '#4A5881', fontWeight: '700' },
  statLabel: { color: palette.muted, fontSize: 10 },
  statValue: { color: palette.ink, fontSize: 15, fontWeight: '800', marginTop: 1 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  searchBox: { height: 42, flex: 1, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11 },
  searchIcon: { color: palette.muted, fontSize: 19, marginRight: 7 },
  searchInput: { flex: 1, paddingVertical: 0, color: palette.ink, fontSize: 12, outlineStyle: 'none' as never },
  clearSearch: { fontSize: 19, color: palette.muted, paddingLeft: 6 },
  filterButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF5', alignItems: 'center', justifyContent: 'center' },
  filterButtonActive: { backgroundColor: palette.mintSoft, borderColor: '#B8E5D8' },
  filterIcon: { color: '#626A80', fontSize: 20 },
  filterIconActive: { color: palette.green },
  filterPanel: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: palette.line, marginBottom: 8 },
  filterLabel: { fontSize: 11, color: palette.muted, fontWeight: '700', marginBottom: 7, marginTop: 3 },
  chipRow: { flexDirection: 'row', gap: 7, marginBottom: 7, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#F6F7FA', borderRadius: 9 },
  filterChipSelected: { backgroundColor: palette.mintSoft },
  filterChipText: { color: '#666E83', fontSize: 11 },
  filterChipTextSelected: { color: palette.green, fontWeight: '700' },
  resultsRow: { height: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  resultsText: { color: palette.muted, fontSize: 10 },
  quickFilters: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F0F1F6', borderRadius: 10, padding: 3 },
  quickChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  quickChipSelected: { backgroundColor: '#DDF6EA' },
  quickChipText: { fontSize: 10, color: '#697085' },
  quickChipTextSelected: { color: palette.green, fontWeight: '700' },
  productCard: { backgroundColor: '#FFFFFF', borderColor: '#ECEEF5', borderWidth: 1, borderRadius: 17, padding: 11, marginBottom: 9, shadowColor: '#212347', shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  avatarText: { color: '#2D7A5E', fontWeight: '800', fontSize: 11 },
  productMain: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  productName: { color: palette.ink, fontWeight: '800', fontSize: 12, flexShrink: 1 },
  categoryBadge: { backgroundColor: '#E5F7F2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  categoryBadgeText: { fontSize: 9, color: palette.green, fontWeight: '700' },
  varietyText: { color: palette.muted, fontSize: 10, marginTop: 3 },
  statusLine: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 5, gap: 4, backgroundColor: palette.greenSoft, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green },
  inactiveDot: { backgroundColor: '#8C91A3' },
  statusText: { color: palette.green, fontSize: 9, fontWeight: '700' },
  inactiveText: { color: '#777D8E' },
  detailsBlock: { marginLeft: 47, marginTop: 4, paddingBottom: 8, gap: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { color: palette.muted, fontSize: 10 },
  priceText: { color: palette.green, fontSize: 11, fontWeight: '800' },
  stockText: { color: '#5276CF', fontSize: 10, fontWeight: '700' },
  lowStockText: { color: '#D94D60' },
  detailValue: { color: '#737A8E', fontSize: 10 },
  codeText: { color: palette.muted, fontSize: 9, marginTop: 1 },
  cardActions: { flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: '#F0F1F6', paddingTop: 8 },
  actionButton: { height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  viewButton: { flex: 1, backgroundColor: '#E5F7F2' },
  editButton: { flex: 1, backgroundColor: '#ECF9F1' },
  viewActionText: { color: palette.green, fontSize: 10, fontWeight: '700' },
  editActionText: { color: '#16825B', fontSize: 10, fontWeight: '700' },
  deleteButton: { width: 84, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F1', borderWidth: 1, borderColor: '#FAD9DE' },
  deleteActionText: { color: '#D94D60', fontSize: 9, fontWeight: '800' },
  restoreButton: { width: 84, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F8F0', borderWidth: 1, borderColor: '#CDEEDC' },
  restoreActionText: { color: '#16825B', fontSize: 9, fontWeight: '800' },
  emptyState: { minHeight: 190, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: palette.mintSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyIconText: { color: palette.green, fontSize: 22, fontWeight: '700' },
  emptyTitle: { color: palette.ink, fontSize: 14, fontWeight: '800' },
  emptyDescription: { color: palette.muted, fontSize: 11, textAlign: 'center', marginTop: 5, lineHeight: 17 },
  retryButton: { marginTop: 13, backgroundColor: palette.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  bottomSafeArea: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: palette.line },
  bottomNav: { width: '100%', maxWidth: 720, alignSelf: 'center', minHeight: 54, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 3, backgroundColor: '#FFFFFF' },
  navItem: { minWidth: 56, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4 },
  navIcon: { color: '#A2A7B7', fontSize: 17, lineHeight: 19 },
  navLabel: { color: '#A2A7B7', fontSize: 9 },
  activeNavIcon: { width: 23, height: 21, alignItems: 'center', justifyContent: 'center' },
  activeNavIconText: { color: palette.green, fontSize: 17 },
  activeNavLabel: { color: palette.green, fontWeight: '700', fontSize: 9 },
  navDot: { position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: palette.green },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(24, 25, 48, 0.38)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  detailModal: { width: '100%', maxWidth: 420, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 20, shadowColor: '#181930', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  modalTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 },
  modalTitle: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  modalClose: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F5F5F9', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: '#737A8E', fontSize: 21, lineHeight: 24 },
  modalIdentity: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalAvatar: { width: 48, height: 48, borderRadius: 16, marginRight: 11, backgroundColor: '#E5F7F2' },
  modalName: { color: palette.ink, fontWeight: '800', fontSize: 15 },
  detailDivider: { height: 1, backgroundColor: palette.line, marginBottom: 12 },
  modalDetailLabel: { color: palette.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.7, marginTop: 9 },
  modalDetailValue: { color: palette.ink, fontSize: 12, marginTop: 3 },
  modalEditButton: { marginTop: 18, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green },
  modalEditText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  confirmModal: { width: '100%', maxWidth: 380, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 20, alignItems: 'center', shadowColor: '#181930', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  confirmIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#FFF0F1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmIconRestore: { backgroundColor: '#E9F8F0' },
  confirmIconText: { color: '#D94D60', fontSize: 20 },
  confirmIconTextRestore: { color: '#16825B' },
  confirmTitle: { color: palette.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  confirmDescription: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 300 },
  confirmProduct: { width: '100%', flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: '#F7F8FC', marginTop: 15 },
  confirmAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#DDF6EA', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  confirmAvatarText: { color: palette.green, fontSize: 10, fontWeight: '800' },
  confirmProductName: { color: palette.ink, fontSize: 11, fontWeight: '700', flex: 1 },
  confirmError: { width: '100%', color: '#C34C5B', fontSize: 10, textAlign: 'center', marginTop: 10 },
  confirmActions: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 17 },
  confirmCancel: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#E4E6EE', alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { color: '#616980', fontSize: 11, fontWeight: '700' },
  confirmSubmit: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#D94D60', alignItems: 'center', justifyContent: 'center' },
  confirmSubmitRestore: { backgroundColor: '#16825B' },
  confirmSubmitBusy: { opacity: 0.7 },
  confirmSubmitText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
