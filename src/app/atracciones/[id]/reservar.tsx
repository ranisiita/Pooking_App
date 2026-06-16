import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import PaymentHall from '../../../components/PaymentHall';
import { AtraccionesService, ATTRACTION_PROVIDER_LABELS, getProviderCompanyName } from '../../../services/atracciones.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { getStorageItem, setStorageItem } from '../../../services/storage';

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';

interface Ticket {
  tck_guid: string;
  tipo: string;
  precio: number;
  moneda: string;
}

interface Horario {
  hor_guid: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cupos: number;
}

interface AttractionDetail {
  id: string;
  nombre: string;
  tipo_nombre: string;
  precio_desde: number;
  moneda: string;
  imagen_principal: string;
  provider: string;
}

export default function AttractionBookingScreen() {
  const router = useRouter();
  const { id, provider } = useLocalSearchParams<{ id: string; provider: string }>();

  const [detalle, setDetalle] = useState<AttractionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedules state
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [horariosCrudos, setHorariosCrudos] = useState<Horario[]>([]);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [rangoDias, setRangoDias] = useState<1 | 3 | 7 | 15>(7);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<Horario | null>(null);

  // Tickets state
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  // Client / Visitor form
  const [cliente, setCliente] = useState({
    nombres: '',
    apellidos: '',
    tipo_identificacion: 'CEDULA',
    numero_identificacion: '',
    correo: '',
    telefono: '',
    direccion: '',
  });
  const [errCliente, setErrCliente] = useState<Partial<Record<string, string>>>({});

  // Payment states
  const [mostrarPago, setMostrarPago] = useState(false);
  const [enviandoPago, setEnviandoPago] = useState(false);
  const [factura, setFactura] = useState<any>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadInitialData() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const prov = (provider as any) || 'jhonatan';
        
        // Fetch attraction details
        const res = await AtraccionesService.getAtraccionDetalle(id, prov);
        if (!res || !res.data) {
          setError('No pudimos encontrar la atracción.');
          setLoading(false);
          return;
        }

        setDetalle(res.data);
        
        // Load schedules
        setHorariosLoading(true);
        const scheds = await AtraccionesService.getHorarios(id, undefined, prov);
        setHorariosCrudos(scheds?.data ?? []);
        setHorariosLoading(false);

        // Fetch prefilled details from logged-in user
        const token = await getStorageItem('token');
        const usuarioGuid = await getStorageItem('usuarioGuid');
        if (usuarioGuid && token) {
          // Re-use client identity endpoint
          const url = `${API_GATEWAY_URL}/api/v2/booking/clientes/usuario-guid/${usuarioGuid}`;
          const clientRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (clientRes.ok) {
            const clientJson = await clientRes.json();
            const client = clientJson.data;
            if (client) {
              setCliente({
                nombres: client.nombres || '',
                apellidos: client.apellidos || '',
                correo: client.correo || '',
                telefono: client.telefono || '',
                numero_identificacion: client.numeroIdentificacion || '',
                tipo_identificacion: (client.tipoIdentificacion === 'CI' || client.tipoIdentificacion === 'CEDULA') ? 'CEDULA' : 'PASAPORTE',
                direccion: client.direccion || '',
              });
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError('Error al iniciar el checkout.');
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [id, provider]);

  // Filter schedules locally based on start date and day range
  const visibleHorarios = useMemo(() => {
    if (!fechaInicio) return horariosCrudos;
    const start = new Date(fechaInicio + 'T00:00:00');
    const end = new Date(fechaInicio + 'T00:00:00');
    end.setDate(end.getDate() + (rangoDias - 1));

    return horariosCrudos.filter(h => {
      const hDate = new Date(h.fecha + 'T00:00:00');
      return hDate >= start && hDate <= end;
    });
  }, [horariosCrudos, fechaInicio, rangoDias]);

  const handleSelectHorario = async (h: Horario) => {
    setHorarioSeleccionado(h);
    setTicketsLoading(true);
    try {
      const prov = (provider as any) || 'jhonatan';
      const tRes = await AtraccionesService.getHorarioTickets(id!, h.hor_guid, prov);
      const items = tRes?.data?.items ?? [];
      setTickets(items);
      
      const counts: Record<string, number> = {};
      items.forEach((t: Ticket) => { counts[t.tck_guid] = 0; });
      setCantidades(counts);
    } catch (err) {
      console.warn(err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const totalTickets = useMemo(() => {
    return Object.values(cantidades).reduce((acc, n) => acc + (n || 0), 0);
  }, [cantidades]);

  const subtotal = useMemo(() => {
    return tickets.reduce((acc, t) => acc + (cantidades[t.tck_guid] ?? 0) * t.precio, 0);
  }, [tickets, cantidades]);

  const iva = useMemo(() => {
    return +(subtotal * 0.15).toFixed(2);
  }, [subtotal]);

  const total = useMemo(() => {
    return +(subtotal + iva).toFixed(2);
  }, [subtotal, iva]);

  const customDetails = useMemo(() => {
    return tickets
      .filter(t => (cantidades[t.tck_guid] ?? 0) > 0)
      .map(t => ({
        name: `${cantidades[t.tck_guid]} × ${t.tipo}`,
        value: (cantidades[t.tck_guid] ?? 0) * t.precio
      }));
  }, [tickets, cantidades]);

  const validate = () => {
    const err: typeof errCliente = {};
    let ok = true;
    if (!cliente.nombres.trim()) { err.nombres = 'Nombres requeridos.'; ok = false; }
    if (!cliente.apellidos.trim()) { err.apellidos = 'Apellidos requeridos.'; ok = false; }
    if (!cliente.numero_identificacion.trim()) { err.numero_identificacion = 'Identificación requerida.'; ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.correo)) { err.correo = 'Correo electrónico inválido.'; ok = false; }
    if (!cliente.telefono.trim() || cliente.telefono.trim().length < 7) { err.telefono = 'Teléfono inválido.'; ok = false; }
    setErrCliente(err);
    return ok;
  };

  const handleReservarClick = () => {
    if (!horarioSeleccionado) {
      alert('Por favor selecciona una fecha y horario para continuar.');
      return;
    }
    if (totalTickets <= 0) {
      alert('Por favor agrega al menos un ticket.');
      return;
    }
    if (!validate()) {
      alert('Por favor completa los campos del visitante.');
      return;
    }

    setMostrarPago(true);
  };

  const handlePagoExitoso = async () => {
    if (!detalle || !horarioSeleccionado) return;
    setEnviandoPago(true);
    try {
      const prov = (provider as any) || 'jhonatan';
      const token = await getStorageItem('token');
      const guidCliente = await getStorageItem('usuarioGuid');

      const lines = tickets
        .filter(t => (cantidades[t.tck_guid] ?? 0) > 0)
        .map(t => ({ tck_guid: t.tck_guid, cantidad: cantidades[t.tck_guid] }));

      const payload = {
        at_guid: detalle.id,
        hor_guid: horarioSeleccionado.hor_guid,
        fecha_visita: horarioSeleccionado.fecha,
        lineas: lines,
        origen_canal: 'BOOKING',
        cliente_invitado: {
          tipo_identificacion: cliente.tipo_identificacion,
          numero_identificacion: cliente.numero_identificacion.trim(),
          nombres: cliente.nombres.trim(),
          apellidos: cliente.apellidos.trim(),
          correo: cliente.correo.trim(),
          telefono: cliente.telefono.trim(),
          direccion: cliente.direccion.trim() || undefined,
        }
      };

      // 1. Create reservation
      const resReserva = await AtraccionesService.crearReserva(payload, prov);
      if (!resReserva || !resReserva.data) {
        alert('Ocurrió un problema al reservar cupos con el proveedor.');
        setEnviandoPago(false);
        return;
      }

      const reserva = resReserva.data;

      // 2. Submit payment confirmation
      const confirmBody = {
        nombre_receptor: cliente.nombres.trim(),
        apellido_receptor: cliente.apellidos.trim(),
        correo_receptor: cliente.correo.trim(),
        telefono_receptor: cliente.telefono.trim() || undefined,
        observacion: `Pago reserva atracción ${reserva.atraccion_nombre}`,
      };
      
      const resPago = await AtraccionesService.confirmarPago(reserva.rev_guid, confirmBody, prov);
      if (!resPago || !resPago.data) {
        alert('No se pudo confirmar el pago de la atracción.');
        setEnviandoPago(false);
        return;
      }

      setFactura(resPago.data);

      // 3. Register in customer booking history (best-effort)
      if (token && guidCliente) {
        try {
          const clientPayload = {
            guidCliente,
            guidServicioRef: "3134e52c-4923-4f67-b5fb-6d4733483fee", // standard snaps
            nombreServicioSnap: reserva.atraccion_nombre,
            tipoServicioSnap: "3", // 3 for Attractions
            nombreProveedor: (ATTRACTION_PROVIDER_LABELS as any)[prov] || prov,
            idReservaExterna: reserva.rev_guid,
            fechaInicio: new Date(`${reserva.hor_fecha}T${reserva.hor_hora_inicio || '09:00:00'}Z`).toISOString(),
            fechaFin: new Date(`${reserva.hor_fecha}T${reserva.hor_hora_fin || '18:00:00'}Z`).toISOString(),
            canalOrigen: 'Pooking',
            montoTotal: reserva.rev_total,
            moneda: reserva.moneda || 'USD',
            observaciones: `Reserva atracción ${reserva.atraccion_nombre} - Código ${reserva.rev_codigo} - Estado PAGADA`
          };

          const regUrl = `${API_GATEWAY_URL}/api/v2/booking/clientes/reservas`;
          await fetch(regUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(clientPayload)
          });
        } catch (e) {
          console.warn('History register failed', e);
        }
      }

      setMostrarPago(false);
    } catch (err) {
      console.error(err);
      alert('Error procesando el pago de tu experiencia.');
    } finally {
      setEnviandoPago(false);
    }
  };

  const handleCerrarFactura = () => {
    setFactura(null);
    router.push('/atracciones' as any);
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.loadingText}>Cargando horarios de la atracción...</Text>
        </View>
        <Footer />
      </View>
    );
  }

  if (error || !detalle) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={54} color={Colors.error} />
          <Text style={s.errorTitle}>Error al cargar</Text>
          <Text style={s.errorText}>{error || 'Atracción no encontrada'}</Text>
          <TouchableOpacity style={s.btnBack} onPress={() => router.push('/atracciones' as any)}>
            <Text style={s.btnBackText}>Volver</Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.container}>
          {/* Booking flow main card */}
          <View style={s.card}>
            <Text style={s.atrHeaderName}>{detalle.nombre}</Text>
            
            {/* Step 1: Horarios */}
            <Text style={s.sectionTitle}>1. Selecciona Fecha y Horario</Text>
            <View style={s.row}>
              <View style={s.field}>
                <Text style={s.label}>Fecha Inicio Consulta</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                  <TextInput style={s.textInp} value={fechaInicio} onChangeText={setFechaInicio} placeholder="YYYY-MM-DD" />
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.label}>Rango de Días</Text>
                <View style={s.pickerWrap}>
                  <TextInput style={s.textInp} value={`${rangoDias} días`} editable={false} />
                  <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                    {[1, 3, 7, 15].map(d => (
                      <TouchableOpacity key={d} style={s.dropdownItem} onPress={() => setRangoDias(d as any)}>
                        <Text style={s.dropdownText}>{d} días</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Horarios List */}
            {horariosLoading ? (
              <ActivityIndicator size="small" color={Colors.titulo} style={{ marginVertical: 12 }} />
            ) : visibleHorarios.length === 0 ? (
              <Text style={s.emptyText}>No hay horarios disponibles en este rango.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horariosGrid}>
                {visibleHorarios.map(h => (
                  <TouchableOpacity
                    key={h.hor_guid}
                    style={[s.horarioChip, horarioSeleccionado?.hor_guid === h.hor_guid && s.horarioChipOn]}
                    onPress={() => handleSelectHorario(h)}
                  >
                    <Text style={[s.horDate, horarioSeleccionado?.hor_guid === h.hor_guid && { color: '#fff' }]}>{h.fecha}</Text>
                    <Text style={[s.horTime, horarioSeleccionado?.hor_guid === h.hor_guid && { color: '#fff' }]}>{h.hora_inicio.substring(0, 5)} - {h.hora_fin.substring(0, 5)}</Text>
                    <Text style={[s.horCupos, horarioSeleccionado?.hor_guid === h.hor_guid && { color: '#fff' }]}>{h.cupos} cupos</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Step 2: Tickets list */}
            {horarioSeleccionado && (
              <View style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
                <Text style={s.sectionTitle}>2. Elige tus Tickets</Text>
                {ticketsLoading ? (
                  <ActivityIndicator size="small" color={Colors.titulo} />
                ) : tickets.length === 0 ? (
                  <Text style={s.emptyText}>No se encontraron tipos de tickets para este horario.</Text>
                ) : (
                  <View style={s.ticketsList}>
                    {tickets.map(t => {
                      const count = cantidades[t.tck_guid] ?? 0;
                      return (
                        <View key={t.tck_guid} style={s.ticketRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.ticketType}>{t.tipo}</Text>
                            <Text style={s.ticketPrice}>${t.precio.toFixed(2)} {t.moneda}</Text>
                          </View>
                          <View style={s.counter}>
                            <TouchableOpacity style={s.counterBtn} onPress={() => setCantidades({ ...cantidades, [t.tck_guid]: Math.max(0, count - 1) })}>
                              <Ionicons name="remove" size={14} color={Colors.titulo} />
                            </TouchableOpacity>
                            <Text style={s.counterText}>{count}</Text>
                            <TouchableOpacity style={s.counterBtn} onPress={() => setCantidades({ ...cantidades, [t.tck_guid]: count + 1 })}>
                              <Ionicons name="add" size={14} color={Colors.titulo} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Step 3: Visitor details */}
            <Text style={s.sectionTitle}>3. Datos del Visitante</Text>
            <View style={s.formGrid}>
              <View style={s.row}>
                <View style={s.field}>
                  <Text style={s.label}>Nombres *</Text>
                  <View style={[s.inputWrap, errCliente.nombres && s.inputWrapError]}>
                    <TextInput style={s.textInp} value={cliente.nombres} onChangeText={v => setCliente({ ...cliente, nombres: v })} placeholder="Nombres" />
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Apellidos *</Text>
                  <View style={[s.inputWrap, errCliente.apellidos && s.inputWrapError]}>
                    <TextInput style={s.textInp} value={cliente.apellidos} onChangeText={v => setCliente({ ...cliente, apellidos: v })} placeholder="Apellidos" />
                  </View>
                </View>
              </View>

              <View style={s.row}>
                <View style={s.field}>
                  <Text style={s.label}>Identificación *</Text>
                  <View style={[s.inputWrap, errCliente.numero_identificacion && s.inputWrapError]}>
                    <TextInput style={s.textInp} value={cliente.numero_identificacion} onChangeText={v => setCliente({ ...cliente, numero_identificacion: v })} placeholder="Identificación" />
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Tipo Identificación</Text>
                  <View style={s.pickerWrap}>
                    <TextInput style={s.textInp} value={cliente.tipo_identificacion} editable={false} />
                    <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity style={s.dropdownItem} onPress={() => setCliente({ ...cliente, tipo_identificacion: 'CEDULA' })}>
                        <Text style={s.dropdownText}>CEDULA</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.dropdownItem} onPress={() => setCliente({ ...cliente, tipo_identificacion: 'PASAPORTE' })}>
                        <Text style={s.dropdownText}>PASAPORTE</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              </View>

              <View style={s.row}>
                <View style={s.field}>
                  <Text style={s.label}>Correo Electrónico *</Text>
                  <View style={[s.inputWrap, errCliente.correo && s.inputWrapError]}>
                    <TextInput style={s.textInp} value={cliente.correo} onChangeText={v => setCliente({ ...cliente, correo: v })} placeholder="correo@ejemplo.com" />
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Teléfono *</Text>
                  <View style={[s.inputWrap, errCliente.telefono && s.inputWrapError]}>
                    <TextInput style={s.textInp} value={cliente.telefono} onChangeText={v => setCliente({ ...cliente, telefono: v })} placeholder="Teléfono" />
                  </View>
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Dirección (Opcional)</Text>
                <View style={s.inputWrap}>
                  <TextInput style={s.textInp} value={cliente.direccion} onChangeText={v => setCliente({ ...cliente, direccion: v })} placeholder="Dirección de residencia" />
                </View>
              </View>
            </View>

            {/* Summary details */}
            {totalTickets > 0 && (
              <View style={s.summaryBox}>
                <Text style={s.summaryTitle}>Resumen Estimado</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Subtotal</Text>
                  <Text style={s.summaryValue}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>IVA (15%)</Text>
                  <Text style={s.summaryValue}>${iva.toFixed(2)}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLabel}>Total</Text>
                  <Text style={s.totalValue}>${total.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={s.actions}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => router.back()}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={handleReservarClick}>
                <Text style={s.btnPrimaryText}>Ir a Pagar</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Footer />
      </ScrollView>

      {/* Payment Overlay Modal */}
      {mostrarPago && (
        <View style={s.paymentOverlay}>
          <PaymentHall
            subtotal={subtotal}
            iva={iva}
            total={total}
            ivaLabel="15.0%"
            itemName={detalle.nombre}
            customDetails={customDetails}
            initialNombre={`${cliente.nombres} ${cliente.apellidos}`}
            initialEmail={cliente.correo}
            initialTelefono={cliente.telefono}
            onPagoExitoso={handlePagoExitoso}
            onCancel={() => setMostrarPago(false)}
            buttonLabel="Confirmar Pago de Experiencia"
          />
        </View>
      )}

      {/* Invoice Modal (Factura) */}
      {factura && (
        <View style={s.invoiceOverlay}>
          <View style={s.invoiceCard}>
            <View style={s.invHeader}>
              <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
              <Text style={s.invTitle}>¡Pago Completado Exitosamente!</Text>
              <Text style={s.invSub}>Factura #{factura.fact_numero || `FAC-${id}`}</Text>
            </View>

            <View style={s.invBody}>
              <View style={s.invRow}>
                <Text style={s.invLabel}>Fecha Emisión</Text>
                <Text style={s.invVal}>{new Date().toLocaleString()}</Text>
              </View>
              <View style={s.invRow}>
                <Text style={s.invLabel}>Cliente</Text>
                <Text style={s.invVal}>{cliente.nombres} {cliente.apellidos}</Text>
              </View>
              <View style={s.invRow}>
                <Text style={s.invLabel}>Correo</Text>
                <Text style={s.invVal}>{cliente.correo}</Text>
              </View>
              
              <View style={s.invDivider} />
              
              <Text style={s.invSection}>Detalle de Compra</Text>
              {customDetails.map((det, idx) => (
                <View key={idx} style={s.invRow}>
                  <Text style={s.invItemName}>{det.name}</Text>
                  <Text style={s.invItemVal}>${det.value.toFixed(2)}</Text>
                </View>
              ))}

              <View style={s.invDivider} />
              
              <View style={s.invRow}>
                <Text style={s.invLabel}>Subtotal</Text>
                <Text style={s.invVal}>${factura.subtotal?.toFixed(2) || subtotal.toFixed(2)}</Text>
              </View>
              <View style={s.invRow}>
                <Text style={s.invLabel}>IVA (15%)</Text>
                <Text style={s.invVal}>${factura.iva?.toFixed(2) || iva.toFixed(2)}</Text>
              </View>
              <View style={s.invRow}>
                <Text style={s.totalLabel}>Total Pagado</Text>
                <Text style={s.totalValue}>${factura.total?.toFixed(2) || total.toFixed(2)} USD</Text>
              </View>
            </View>

            <View style={s.invActions}>
              <TouchableOpacity style={s.btnSecondary} onPress={handleCerrarFactura}>
                <Text style={s.btnSecondaryText}>Volver al listado</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/profile')}>
                <Text style={s.btnPrimaryText}>Ir a mis reservas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },
  loadingBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400 },
  loadingText: { color: Colors.subtitulo, fontSize: 13, marginTop: 8 },
  errorBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: Spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  errorText: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center' },
  btnBack: { backgroundColor: Colors.titulo, paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm },
  btnBackText: { color: '#fff', fontWeight: '700' },

  container: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  atrHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.titulo,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  row: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: Spacing.md },
  field: { flex: 1, gap: 4, position: 'relative' },
  label: { fontSize: 10, fontWeight: '700', color: Colors.subtitulo, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: BorderRadius.sm, paddingHorizontal: 10, height: 40, backgroundColor: Colors.bg },
  inputWrapError: { borderColor: Colors.error },
  pickerWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: BorderRadius.sm, paddingHorizontal: 10, height: 40, backgroundColor: Colors.bg, zIndex: 10 },
  textInp: { flex: 1, fontSize: 13, color: Colors.extra1 },
  dropdownScroll: { position: 'absolute', top: 38, left: 0, right: 0, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, maxHeight: 120, zIndex: 100, borderRadius: BorderRadius.sm, ...Shadow.md, display: Platform.OS === 'web' ? 'flex' : 'none' },
  dropdownItem: { paddingVertical: 8, paddingHorizontal: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownText: { fontSize: 12, color: Colors.extra1 },
  emptyText: { fontSize: 12, color: Colors.subtitulo, fontStyle: 'italic', marginVertical: 8 },

  // Horarios chips
  horariosGrid: { gap: Spacing.sm, paddingVertical: 4 },
  horarioChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    minWidth: 110,
    alignItems: 'center',
    gap: 2,
  },
  horarioChipOn: {
    backgroundColor: Colors.titulo,
    borderColor: Colors.titulo,
  },
  horDate: { fontSize: 12, fontWeight: '700', color: Colors.extra1 },
  horTime: { fontSize: 11, color: Colors.subtitulo },
  horCupos: { fontSize: 10, color: Colors.titulo, fontWeight: '600', marginTop: 2 },

  // Tickets
  ticketsList: { gap: Spacing.sm },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, backgroundColor: Colors.bg },
  ticketType: { fontSize: 13, fontWeight: '700', color: Colors.extra1 },
  ticketPrice: { fontSize: 12, color: Colors.titulo, fontWeight: '600', marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  counterBtn: { padding: 6, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  counterText: { paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: Colors.extra1 },

  // Visitor Form
  formGrid: { gap: Spacing.sm },

  // Summary box
  summaryBox: { backgroundColor: 'rgba(198,177,125,0.08)', borderWidth: 1, borderColor: 'rgba(198,177,125,0.25)', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs, marginTop: Spacing.sm },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: Colors.titulo, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: Colors.subtitulo },
  summaryValue: { fontSize: 12, color: Colors.extra1, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(198,177,125,0.3)', marginVertical: 4 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  totalValue: { fontSize: 15, fontWeight: '700', color: Colors.titulo },

  // Actions
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.titulo, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: Colors.titulo, fontWeight: '700', fontSize: 13 },
  btnPrimary: { flex: 1.5, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: BorderRadius.sm, backgroundColor: Colors.titulo, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Overlays
  paymentOverlay: { ...StyleSheet.absoluteFill, backgroundColor: Colors.bg, zIndex: 1000 },
  invoiceOverlay: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: Spacing.md, zIndex: 2000 },
  invoiceCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderTopWidth: 5, borderTopColor: Colors.success, width: '100%', maxWidth: 500, padding: Spacing.lg, gap: Spacing.md, ...Shadow.lg },
  invHeader: { alignItems: 'center', gap: Spacing.xs },
  invTitle: { fontSize: 18, fontWeight: '700', color: Colors.success, textAlign: 'center' },
  invSub: { fontSize: 12, color: Colors.subtitulo },
  invBody: { gap: Spacing.sm },
  invRow: { flexDirection: 'row', justifyContent: 'space-between' },
  invLabel: { fontSize: 12, color: Colors.subtitulo },
  invVal: { fontSize: 12, fontWeight: '600', color: Colors.extra1 },
  invDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  invSection: { fontSize: 12, fontWeight: '700', color: Colors.titulo, textTransform: 'uppercase', letterSpacing: 0.5 },
  invItemName: { fontSize: 12, color: Colors.extra1 },
  invItemVal: { fontSize: 12, fontWeight: '600', color: Colors.extra1 },
  invActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
