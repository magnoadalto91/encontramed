import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import { COLORS } from '../../utils/constants';

export default function ContratoScreen({ route, navigation }) {
  const { plantaoId, titulo, onAceite } = route.params;
  const showToast = useToast();
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    api.get(`/contratos/${plantaoId}/status`)
      .then(r => setContrato(r.data))
      .catch(() => showToast('Erro ao carregar contrato', 'error'))
      .finally(() => setLoading(false));
  }, [plantaoId]);

  const aceitar = () => {
    Alert.alert(
      'Confirmar aceite',
      'Ao confirmar, você aceita eletronicamente os termos deste contrato. Esta ação fica registrada com data, hora e IP do seu dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar contrato',
          onPress: async () => {
            setAceitando(true);
            try {
              await api.post(`/contratos/${plantaoId}/aceitar`);
              showToast('Contrato aceito!', 'success');
              if (onAceite) onAceite();
              navigation.goBack();
            } catch (err) {
              showToast(err?.response?.data?.error || 'Erro ao aceitar', 'error');
            } finally {
              setAceitando(false);
            }
          },
        },
      ]
    );
  };

  const verPDF = async () => {
    const url = `${api.defaults.baseURL}/contratos/${plantaoId}/pdf`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
    else showToast('Não foi possível abrir o PDF', 'error');
  };

  const assinado = contrato?.status === 'ASSINADO';

  return (
    <LinearGradient colors={['#0A1628', '#0D1B2E']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contrato</Text>
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 60 }} />
          ) : (
            <>
              {/* Status badge */}
              <View style={[styles.statusCard, assinado ? styles.statusAssinado : styles.statusPendente]}>
                <Ionicons
                  name={assinado ? 'checkmark-circle' : 'time-outline'}
                  size={32}
                  color={assinado ? COLORS.success : COLORS.warning}
                />
                <Text style={[styles.statusText, { color: assinado ? COLORS.success : COLORS.warning }]}>
                  {assinado ? 'Contrato aceito' : 'Aguardando seu aceite'}
                </Text>
                {assinado && contrato?.assinadoEm && (
                  <Text style={styles.statusSub}>
                    Aceito em {new Date(contrato.assinadoEm).toLocaleString('pt-BR')}
                  </Text>
                )}
              </View>

              {/* Info card */}
              <View style={styles.infoCard}>
                <Ionicons name="document-text-outline" size={40} color={COLORS.accent} style={{ marginBottom: 12 }} />
                <Text style={styles.infoTitle}>{titulo || `Plantão #${plantaoId}`}</Text>
                <Text style={styles.infoText}>
                  Este é um contrato de prestação de serviços médicos gerado automaticamente pela Plataforma EncontraMed.
                </Text>
                <Text style={styles.infoText}>
                  O aceite eletrônico tem validade jurídica pela Lei 14.063/2020 e registra sua aceitação com data, hora e IP.
                </Text>
              </View>

              {/* Actions */}
              <TouchableOpacity style={styles.pdfBtn} onPress={verPDF}>
                <Ionicons name="eye-outline" size={18} color={COLORS.accent} />
                <Text style={styles.pdfBtnText}>Visualizar contrato completo (PDF)</Text>
              </TouchableOpacity>

              {!assinado && (
                <Button
                  title="Aceitar contrato com 1 clique"
                  onPress={aceitar}
                  loading={aceitando}
                  style={{ marginTop: 12 }}
                />
              )}

              <Text style={styles.disclaimer}>
                Ao aceitar, você confirma que leu e concorda com todos os termos. Este registro é irrevogável.
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0, gap: 8 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  content: { flex: 1, padding: 20 },

  statusCard: { borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  statusAssinado: { backgroundColor: 'rgba(46,213,115,0.08)', borderColor: 'rgba(46,213,115,0.3)' },
  statusPendente: { backgroundColor: 'rgba(255,200,0,0.08)', borderColor: 'rgba(255,200,0,0.3)' },
  statusText: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  statusSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },

  infoCard: { backgroundColor: '#112240', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 16 },
  infoTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  infoText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 8 },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.accent },
  pdfBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },

  disclaimer: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
