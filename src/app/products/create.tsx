import { useState } from 'react';
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
import { useRouter } from 'expo-router';
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
  red: '#E05263',
};

const GROWTH_STAGES = ['Semilla', 'Germinación', 'Plántula', 'Crecimiento', 'Floración', 'Fructificación', 'Cosecha', 'Otro'];

function Field({
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

export default function CreateProductScreen() {
  const router = useRouter();
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

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(previous => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.product_name.trim() || !formData.category_name.trim() || !formData.current_stock.trim() || !formData.sale_price.trim()) {
      Alert.alert('Faltan datos', 'Completa los campos marcados con * para registrar el producto.');
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
      const newProduct: Omit<Product, 'id'> = {
        product_code: formData.product_code.trim() || undefined,
        product_name: formData.product_name.trim(),
        category_name: formData.category_name.trim(),
        variety: formData.variety.trim() || null,
        description: formData.description.trim() || null,
        growth_stage: formData.growth_stage,
        plant_height: formData.plant_height.trim() ? parseFloat(formData.plant_height) : null,
        current_stock: stock,
        sale_price: price,
        is_active: true,
      };

      await productService.create(newProduct);
      Alert.alert('Producto registrado', `${newProduct.product_name} ya está en tu inventario.`);
      router.replace('/products');
    } catch (error) {
      console.error('Error creating product', error);
      Alert.alert('No se pudo registrar', 'Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver a productos" onPress={() => router.replace('/products')} style={styles.backButton}>
              <ThemedText style={styles.backArrow}>‹</ThemedText>
            </Pressable>
            <View style={styles.brandMark}><ThemedText style={styles.brandMarkText}>P</ThemedText></View>
            <ThemedText style={styles.brandName}>Inventario</ThemedText>
            <View style={styles.heroSpacer} />
            <ThemedText style={styles.stepText}>01 / 01</ThemedText>
          </View>
          <ThemedText style={styles.heroTitle}>Nuevo producto</ThemedText>
          <ThemedText style={styles.heroSubtitle}>Registra los datos del producto para tu inventario.</ThemedText>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        </View>

        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              {/* Información básica */}
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}><ThemedText style={styles.sectionIconText}>☰</ThemedText></View>
                <View style={styles.sectionHeadingText}>
                  <ThemedText style={styles.sectionTitle}>Información del producto</ThemedText>
                  <ThemedText style={styles.sectionHint}>Los campos con * son obligatorios</ThemedText>
                </View>
              </View>

              <Field label="Nombre del producto" placeholder="Ej. Rosa Roja Premium" value={formData.product_name} onChangeText={value => updateField('product_name', value)} icon="✦" required autoCapitalize="words" />
              <Field label="Código del producto" placeholder="Ej. PROD-001" value={formData.product_code} onChangeText={value => updateField('product_code', value)} icon="#" autoCapitalize="characters" />

              <View style={styles.fieldRow}>
                <View style={styles.halfField}>
                  <Field label="Categoría" placeholder="Ej. Flores" value={formData.category_name} onChangeText={value => updateField('category_name', value)} icon="⊞" required autoCapitalize="words" />
                </View>
                <View style={styles.halfField}>
                  <Field label="Variedad" placeholder="Ej. Híbrida" value={formData.variety} onChangeText={value => updateField('variety', value)} icon="❀" autoCapitalize="words" />
                </View>
              </View>

              <Field label="Descripción" placeholder="Descripción del producto..." value={formData.description} onChangeText={value => updateField('description', value)} icon="✎" multiline />

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

              <Field label="Altura de planta (cm)" placeholder="Ej. 45.5" value={formData.plant_height} onChangeText={value => updateField('plant_height', value)} icon="↕" keyboardType="decimal-pad" />

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
                  <Field label="Stock actual" placeholder="Ej. 100" value={formData.current_stock} onChangeText={value => updateField('current_stock', value)} icon="☰" keyboardType="numeric" required />
                </View>
                <View style={styles.halfField}>
                  <Field label="Precio de venta (S/)" placeholder="Ej. 25.50" value={formData.sale_price} onChangeText={value => updateField('sale_price', value)} icon="$" keyboardType="decimal-pad" required />
                </View>
              </View>

              <View style={styles.privacyNote}>
                <ThemedText style={styles.privacyIcon}>✓</ThemedText>
                <ThemedText style={styles.privacyText}>Los datos de tu inventario se almacenan de forma segura y solo se usan para gestionar tu negocio.</ThemedText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/products')} style={styles.cancelButton}>
              <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={submitting} onPress={handleSave} style={[styles.saveButton, submitting && styles.saveButtonDisabled]}>
              {submitting ? <ActivityIndicator color={colors.white} /> : <ThemedText style={styles.saveButtonText}>Crear producto  <ThemedText style={styles.saveArrow}>→</ThemedText></ThemedText>}
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
  hero: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 22, backgroundColor: colors.greenDark, borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  heroTop: { flexDirection: 'row', alignItems: 'center', minHeight: 39 },
  backButton: { width: 32, height: 32, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  backArrow: { color: colors.white, fontSize: 27, lineHeight: 29, marginTop: -3 },
  brandMark: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  brandName: { color: colors.white, fontSize: 12, fontWeight: '700', marginLeft: 7, letterSpacing: 0.3 },
  heroSpacer: { flex: 1 },
  stepText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 18, letterSpacing: -0.4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.74)', fontSize: 12, marginTop: 5 },
  progressTrack: { height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 17, overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', borderRadius: 3, backgroundColor: '#A0E8C8' },
  content: { flex: 1, marginTop: -12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingBottom: 14 },
  formCard: { backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 17, borderWidth: 1, borderColor: '#F0F1F6', shadowColor: '#2B2458', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  sectionIconText: { color: colors.green, fontSize: 15, fontWeight: '700' },
  sectionIconBlue: { backgroundColor: '#EAF1FF' },
  sectionIconBlueText: { color: '#5276CF' },
  sectionIconMint: { backgroundColor: '#FFF0CE' },
  sectionIconMintText: { color: '#A86A12' },
  sectionHeadingText: { flex: 1 },
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  sectionHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  sectionDivider: { height: 1, backgroundColor: '#F0F1F6', marginVertical: 16 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, minWidth: 0 },
  field: { marginBottom: 11, flex: 1 },
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
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F4FBF7', borderRadius: 11, padding: 10, marginTop: 1 },
  privacyIcon: { width: 17, height: 17, borderRadius: 6, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: '#4D9A79', backgroundColor: '#DDF4E8', fontSize: 10, fontWeight: '800', marginRight: 7 },
  privacyText: { flex: 1, color: '#727A90', fontSize: 9, lineHeight: 14 },
  footer: { flexDirection: 'row', gap: 9, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderTopWidth: 1, borderTopColor: '#ECEEF4', backgroundColor: '#FFFFFF' },
  cancelButton: { width: '34%', minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: '#E4E6EE', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: '#616980', fontSize: 12, fontWeight: '700' },
  saveButton: { flex: 1, minHeight: 45, borderRadius: 13, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: colors.greenDark, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  saveArrow: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
