import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Product } from '@/types/product';
import { productService } from '@/services/productService';

const colors = {
  green: '#16825B',
  greenDark: '#0D6B4A',
  greenTint: '#E5F7F2',
  ink: '#252747',
  muted: '#9198AC',
  line: '#E9EBF2',
  canvas: '#F7F8FC',
  white: '#FFFFFF',
  blueTint: '#EAF1FF',
  red: '#E05263',
};

const GROWTH_STAGES = ['Semilla', 'Germinación', 'Plántula', 'Crecimiento', 'Floración', 'Fructificación', 'Cosecha', 'Otro'];

function EditField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType,
  autoCapitalize,
  required = false,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}{required && <ThemedText style={styles.required}> *</ThemedText>}</ThemedText>
      <View style={[styles.inputShell, multiline && styles.textAreaShell]}>
        <ThemedText style={styles.inputIcon}>{icon}</ThemedText>
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(id) ? id[0] : id;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category_name: '',
    variety: '',
    description: '',
    growth_stage: 'Semilla',
    plant_height: '',
    current_stock: '',
    sale_price: '',
  });

  const goToList = () => router.replace('/products');
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(previous => ({ ...previous, [field]: value }));
  };

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    try {
      const data = await productService.getById(productId);
      setProduct(data);
      setFormData({
        product_code: data.product_code ?? '',
        product_name: data.product_name ?? '',
        category_name: data.category_name ?? '',
        variety: data.variety ?? '',
        description: data.description ?? '',
        growth_stage: data.growth_stage ?? 'Semilla',
        plant_height: data.plant_height != null ? String(data.plant_height) : '',
        current_stock: String(data.current_stock ?? 0),
        sale_price: String(data.sale_price ?? 0),
      });
    } catch (error) {
      console.error('Error fetching product', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void Promise.resolve().then(loadProduct); }, [loadProduct]);

  const handleUpdate = async () => {
    if (!productId || !product) return;
    if (!formData.product_name.trim() || !formData.category_name.trim() || !formData.current_stock.trim() || !formData.sale_price.trim()) {
      Alert.alert('Faltan datos', 'Completa los campos marcados con * para guardar los cambios.');
      return;
    }

    const stock = parseInt(formData.current_stock, 10);
    const price = parseFloat(formData.sale_price);

    if (isNaN(stock) || stock < 0) {
      Alert.alert('Stock no válido', 'El stock debe ser un número entero mayor o igual a 0.');
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert('Precio no válido', 'El precio debe ser un número mayor o igual a 0.');
      return;
    }

    setSubmitting(true);
    try {
      await productService.update(productId, {
        ...product,
        product_code: formData.product_code.trim() || undefined,
        product_name: formData.product_name.trim(),
        category_name: formData.category_name.trim(),
        variety: formData.variety.trim() || null,
        description: formData.description.trim() || null,
        growth_stage: formData.growth_stage,
        plant_height: formData.plant_height.trim() ? parseFloat(formData.plant_height) : null,
        current_stock: stock,
        sale_price: price,
      });
      Alert.alert('Cambios guardados', `Se actualizó la información de ${formData.product_name}.`);
      goToList();
    } catch (error) {
      console.error('Error updating product', error);
      Alert.alert('No se pudieron guardar los cambios', 'Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.green} />
            <ThemedText style={styles.stateText}>Cargando datos del producto…</ThemedText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (loadError || !product) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerState}>
            <View style={styles.errorIcon}><ThemedText style={styles.errorIconText}>!</ThemedText></View>
            <ThemedText style={styles.stateTitle}>No pudimos abrir este producto</ThemedText>
            <ThemedText style={styles.stateText}>Comprueba tu conexión e inténtalo otra vez.</ThemedText>
            <Pressable onPress={() => { setLoading(true); setLoadError(false); loadProduct(); }} style={styles.retryButton}><ThemedText style={styles.retryText}>Intentar de nuevo</ThemedText></Pressable>
            <Pressable onPress={goToList} style={styles.errorBackButton}><ThemedText style={styles.errorBackText}>Volver a productos</ThemedText></Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const initials = product.product_name
    ? product.product_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'PR';

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver a productos" onPress={goToList} style={styles.backButton}>
              <ThemedText style={styles.backArrow}>‹</ThemedText>
            </Pressable>
            <View style={styles.brandMark}><ThemedText style={styles.brandMarkText}>P</ThemedText></View>
            <ThemedText style={styles.brandName}>Inventario</ThemedText>
            <View style={styles.heroSpacer} />
            <View style={[styles.statusPill, product.is_active === false && styles.inactivePill]}>
              <View style={[styles.statusDot, product.is_active === false && styles.inactiveDot]} />
              <ThemedText style={[styles.statusText, product.is_active === false && styles.inactiveStatusText]}>{product.is_active === false ? 'Inactivo' : 'Activo'}</ThemedText>
            </View>
          </View>
          <View style={styles.heroContent}>
            <View style={styles.profileAvatar}><ThemedText style={styles.profileInitials}>{initials}</ThemedText></View>
            <View style={styles.heroCopy}>
              <ThemedText style={styles.heroEyebrow}>EDITAR PRODUCTO</ThemedText>
              <ThemedText numberOfLines={1} style={styles.heroTitle}>{product.product_name}</ThemedText>
              <ThemedText numberOfLines={1} style={styles.heroSubtitle}>{product.category_name} · {product.product_code || 'Sin código'}</ThemedText>
            </View>
          </View>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        </View>

        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              {/* Información básica */}
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}><ThemedText style={styles.sectionIconText}>☰</ThemedText></View>
                <View style={styles.sectionHeadingText}>
                  <ThemedText style={styles.sectionTitle}>Información del producto</ThemedText>
                  <ThemedText style={styles.sectionHint}>Actualiza los datos básicos del producto</ThemedText>
                </View>
              </View>

              <EditField label="Nombre del producto" placeholder="Nombre" value={formData.product_name} onChangeText={value => updateField('product_name', value)} icon="✦" required autoCapitalize="words" />
              <EditField label="Código del producto" placeholder="Código" value={formData.product_code} onChangeText={value => updateField('product_code', value)} icon="#" autoCapitalize="characters" />

              <View style={styles.fieldRow}>
                <View style={styles.halfField}>
                  <EditField label="Categoría" placeholder="Categoría" value={formData.category_name} onChangeText={value => updateField('category_name', value)} icon="⊞" required autoCapitalize="words" />
                </View>
                <View style={styles.halfField}>
                  <EditField label="Variedad" placeholder="Variedad" value={formData.variety} onChangeText={value => updateField('variety', value)} icon="❀" autoCapitalize="words" />
                </View>
              </View>

              <EditField label="Descripción" placeholder="Descripción del producto..." value={formData.description} onChangeText={value => updateField('description', value)} icon="✎" multiline />

              <View style={styles.sectionDivider} />

              {/* Etapa de crecimiento */}
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, styles.sectionIconBlue]}><ThemedText style={[styles.sectionIconText, styles.sectionIconBlueText]}>⌕</ThemedText></View>
                <View style={styles.sectionHeadingText}>
                  <ThemedText style={styles.sectionTitle}>Crecimiento</ThemedText>
                  <ThemedText style={styles.sectionHint}>Etapa actual y altura de la planta</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.fieldLabel}>Etapa de crecimiento</ThemedText>
              <View style={styles.stageSelector}>
                {GROWTH_STAGES.map(stage => (
                  <Pressable
                    key={stage}
                    onPress={() => updateField('growth_stage', stage)}
                    style={[styles.stageChip, formData.growth_stage === stage && styles.stageChipSelected]}
                  >
                    <ThemedText style={[styles.stageChipText, formData.growth_stage === stage && styles.stageChipTextSelected]}>{stage}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <EditField label="Altura de planta (cm)" placeholder="Ej. 45.5" value={formData.plant_height} onChangeText={value => updateField('plant_height', value)} icon="↕" keyboardType="decimal-pad" />

              <View style={styles.sectionDivider} />

              {/* Stock y Precio */}
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, styles.sectionIconMint]}><ThemedText style={[styles.sectionIconText, styles.sectionIconMintText]}>$</ThemedText></View>
                <View style={styles.sectionHeadingText}>
                  <ThemedText style={styles.sectionTitle}>Stock y precio</ThemedText>
                  <ThemedText style={styles.sectionHint}>Control de inventario y precio de venta</ThemedText>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.halfField}>
                  <EditField label="Stock actual" placeholder="Stock" value={formData.current_stock} onChangeText={value => updateField('current_stock', value)} icon="☰" keyboardType="numeric" required />
                </View>
                <View style={styles.halfField}>
                  <EditField label="Precio de venta (S/)" placeholder="Precio" value={formData.sale_price} onChangeText={value => updateField('sale_price', value)} icon="$" keyboardType="decimal-pad" required />
                </View>
              </View>

              <View style={styles.updatedNote}>
                <View style={styles.noteIcon}><ThemedText style={styles.noteIconText}>✓</ThemedText></View>
                <ThemedText style={styles.updatedNoteText}>Los cambios se aplicarán al producto en el inventario.</ThemedText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={goToList} style={styles.cancelButton}>
              <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={submitting} onPress={handleUpdate} style={[styles.saveButton, submitting && styles.saveButtonDisabled]}>
              {submitting ? <ActivityIndicator color={colors.white} /> : <ThemedText style={styles.saveButtonText}>Guardar cambios  <ThemedText style={styles.saveArrow}>✓</ThemedText></ThemedText>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  safeArea: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 20, backgroundColor: colors.greenDark, borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  heroTop: { flexDirection: 'row', alignItems: 'center', minHeight: 39 },
  backButton: { width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  backArrow: { color: colors.white, fontSize: 27, lineHeight: 29, marginTop: -3 },
  brandMark: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  brandName: { color: colors.white, fontSize: 12, fontWeight: '700', marginLeft: 7, letterSpacing: 0.3 },
  heroSpacer: { flex: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(222,255,239,0.17)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  inactivePill: { backgroundColor: 'rgba(255,255,255,0.14)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6FF0B5' },
  inactiveDot: { backgroundColor: '#D6D9E3' },
  statusText: { color: '#E5FFF3', fontSize: 9, fontWeight: '700' },
  inactiveStatusText: { color: '#FFFFFF' },
  heroContent: { flexDirection: 'row', alignItems: 'center', marginTop: 17 },
  profileAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A0E8C8', marginRight: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  profileInitials: { color: colors.greenDark, fontSize: 15, fontWeight: '900' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { color: '#A0E8C8', fontSize: 8, letterSpacing: 1.2, fontWeight: '800' },
  heroTitle: { color: colors.white, fontSize: 21, fontWeight: '800', marginTop: 2 },
  heroSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 3 },
  progressTrack: { height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 15, overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', borderRadius: 3, backgroundColor: '#A0E8C8' },
  content: { flex: 1, marginTop: -12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 14 },
  formCard: { backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 17, borderWidth: 1, borderColor: '#F0F1F6', shadowColor: '#2B2458', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  sectionIconText: { color: colors.green, fontSize: 15, fontWeight: '700' },
  sectionIconBlue: { backgroundColor: colors.blueTint },
  sectionIconBlueText: { color: '#5276CF' },
  sectionIconMint: { backgroundColor: '#FFF0CE' },
  sectionIconMintText: { color: '#A86A12' },
  sectionHeadingText: { flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  sectionHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  sectionDivider: { height: 1, backgroundColor: '#F0F1F6', marginVertical: 16 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, minWidth: 0 },
  field: { flex: 1, marginBottom: 11 },
  fieldLabel: { color: '#424960', fontSize: 10, fontWeight: '600', marginBottom: 5 },
  required: { color: colors.red, fontWeight: '800' },
  inputShell: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EF', backgroundColor: '#FCFCFE', borderRadius: 11, paddingHorizontal: 10 },
  textAreaShell: { minHeight: 68, alignItems: 'flex-start', paddingTop: 10 },
  inputIcon: { width: 17, textAlign: 'center', color: '#9DA4B6', fontSize: 13, marginRight: 7 },
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 11, paddingVertical: 8, outlineStyle: 'none' as never },
  textArea: { minHeight: 48, paddingTop: 0 },
  stageSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  stageChip: { paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#F2F3F8', borderRadius: 9 },
  stageChipSelected: { backgroundColor: colors.greenTint },
  stageChipText: { color: '#777F93', fontSize: 10, fontWeight: '600' },
  stageChipTextSelected: { color: colors.green, fontWeight: '700' },
  updatedNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4FBF7', borderRadius: 11, padding: 10, marginTop: 1 },
  noteIcon: { width: 18, height: 18, borderRadius: 6, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  noteIconText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  updatedNoteText: { flex: 1, color: '#727A90', fontSize: 9, lineHeight: 14 },
  footer: { flexDirection: 'row', gap: 9, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderTopWidth: 1, borderTopColor: '#ECEEF4', backgroundColor: '#FFFFFF' },
  cancelButton: { width: '34%', minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: '#E4E6EE', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: '#616980', fontSize: 12, fontWeight: '700' },
  saveButton: { flex: 1, minHeight: 45, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: colors.greenDark, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  saveArrow: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  stateText: { color: colors.muted, fontSize: 12, marginTop: 12, textAlign: 'center' },
  stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  errorIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center' },
  errorIconText: { color: colors.green, fontSize: 22, fontWeight: '800' },
  retryButton: { backgroundColor: colors.green, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 11, marginTop: 17 },
  retryText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  errorBackButton: { padding: 12, marginTop: 3 },
  errorBackText: { color: colors.green, fontSize: 12, fontWeight: '700' },
});
