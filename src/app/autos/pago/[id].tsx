import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Platform, TouchableOpacity, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import PaymentHall from '../../../components/PaymentHall';
import { CarService } from '../../../services/cars.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { getStorageItem, setStorageItem, removeStorageItem } from '../../../services/storage';

const { width } = Dimensions.get('window');

export default function CarPaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vehiculo, setVehiculo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const [extras, setExtras] = useState<any[]>([]);
  const [conductor, setConductor] = useState<any>(null);
  const [others, setOthers] = useState<any[]>([]);
  const [times, setTimes] = useState<any>(null);

  useEffect(() => {
    async function loadPaymentData() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const rawCar = await getStorageItem('car-selected');
        const rawExtras = await getStorageItem('car-extras');
        const rawConductor = await getStorageItem('car-conductor');
        const rawOthers = await getStorageItem('car-others');
        const rawTimes = await getStorageItem('car-times');

        if (!rawCar || !rawConductor) {
          setError('No se pudo encontrar información sobre el vehículo o el conductor.');
          setLoading(false);
          return;
        }

        const carObj = JSON.parse(rawCar);
        if (carObj.idVehiculo !== +id) {
          setError('El vehículo en sesión no coincide con la ruta.');
          setLoading(false);
          return;
        }

        setVehiculo(carObj);
        setConductor(JSON.parse(rawConductor));
        
        if (rawExtras) setExtras(JSON.parse(rawExtras));
        if (rawOthers) setOthers(JSON.parse(rawOthers));
        if (rawTimes) setTimes(JSON.parse(rawTimes));

      } catch (err) {
        console.error(err);
        setError('Error al recuperar los datos de facturación.');
      } finally {
        setLoading(false);
      }
    }
    loadPaymentData();
  }, [id]);

  // Calculations
  const cantidadDias = useMemo(() => {
    return vehiculo?.disponibilidad?.cantidadDias || 1;
  }, [vehiculo]);

  const subtotalVehiculo = useMemo(() => {
    return vehiculo?.precio?.subtotalVehiculo ?? ((vehiculo?.precio?.precioBaseDia || 0) * cantidadDias);
  }, [vehiculo, cantidadDias]);

  const subtotalExtras = useMemo(() => {
    return extras.reduce((acc, e) => acc + (e.extra.valorFijo * e.cantidad * cantidadDias), 0);
  }, [extras, cantidadDias]);

  const subtotal = useMemo(() => {
    return +(subtotalVehiculo + subtotalExtras).toFixed(2);
  }, [subtotalVehiculo, subtotalExtras]);

  const iva = useMemo(() => {
    return +(subtotal * 0.15).toFixed(2);
  }, [subtotal]);

  const total = useMemo(() => {
    return +(subtotal + iva).toFixed(2);
  }, [subtotal, iva]);

  const customDetails = useMemo(() => {
    const list: { name: string; value: number }[] = [];
    if (vehiculo) {
      list.push({
        name: `Alquiler ${vehiculo.marca} ${vehiculo.modelo} (${cantidadDias} días)`,
        value: subtotalVehiculo
      });
    }
    extras.forEach(e => {
      if (e.cantidad > 0) {
        list.push({
          name: `${e.extra.nombre} (x${e.cantidad})`,
          value: e.extra.valorFijo * e.cantidad * cantidadDias
        });
      }
    });
    return list;
  }, [vehiculo, extras, cantidadDias, subtotalVehiculo]);

  const handlePagoExitoso = async () => {
    if (!vehiculo || !conductor) return;

    setConfirmando(true);
    try {
      const token = await getStorageItem('token');
      const guidCliente = await getStorageItem('usuarioGuid');

      const rec = (vehiculo.disponibilidad?.fechaRecogida ?? '').split('T')[0];
      const dev = (vehiculo.disponibilidad?.fechaDevolucion ?? '').split('T')[0];
      const idLocRec = vehiculo.localizacion?.idLocalizacion ?? 0;
      const idLocDev = times?.idLocalizacionDevolucion ?? idLocRec;

      const payload = {
        idVehiculo: vehiculo.idVehiculo,
        idLocalizacionRecogida: idLocRec,
        idLocalizacionDevolucion: idLocDev,
        fechaInicio: rec,
        fechaFin: dev,
        horaInicio: times?.horaRecogida || '08:00',
        horaFin: times?.horaDevolucion || '10:00',
        cliente: {
          nombres: conductor.nombres,
          apellidos: conductor.apellidos,
          tipoIdentificacion: conductor.tipoIdentificacion,
          numeroIdentificacion: conductor.numeroIdentificacion,
          correo: conductor.correo,
          telefono: conductor.telefono,
        },
        conductores: [
          {
            nombres: conductor.nombres,
            apellidos: conductor.apellidos,
            tipoIdentificacion: conductor.tipoIdentificacion,
            numeroIdentificacion: conductor.numeroIdentificacion,
            fechaVencimientoLicencia: conductor.fechaVencimientoLicencia,
            edadConductor: +conductor.edadConductor || 18,
            correo: conductor.correo,
            telefono: conductor.telefono,
            esPrincipal: true,
          },
          ...others.map(p => ({
            nombres: p.nombres,
            apellidos: p.apellidos,
            tipoIdentificacion: p.tipoIdentificacion,
            numeroIdentificacion: p.numeroIdentificacion,
            fechaVencimientoLicencia: p.fechaVencimientoLicencia,
            edadConductor: +p.edadConductor || 18,
            correo: p.correo,
            telefono: p.telefono,
            esPrincipal: false,
          }))
        ],
        extras: extras.filter(e => e.cantidad > 0).map(e => ({
          idExtra: e.extra.idExtra,
          cantidad: e.cantidad,
        })),
      };

      const resReserva = await CarService.crearReserva(vehiculo.provider, payload);
      if (!resReserva) {
        alert('Ocurrió un problema al reservar en el microservicio. Se canceló la transacción.');
        return;
      }

      // Customer account middleware register
      if (token && guidCliente) {
        const payloadCliente = {
          guidCliente: guidCliente,
          guidServicioRef: "1541e52c-4923-4f67-b5fb-6d4733483fee", // standard snaps
          nombreServicioSnap: `${resReserva.vehiculo?.marca || vehiculo.marca} ${resReserva.vehiculo?.modelo || vehiculo.modelo}`,
          tipoServicioSnap: "2", // 2 for Car rental
          nombreProveedor: vehiculo.provider,
          idReservaExterna: resReserva.codigoReserva,
          fechaInicio: resReserva.fechaInicio ? new Date(`${resReserva.fechaInicio}T00:00:00Z`).toISOString() : new Date().toISOString(),
          fechaFin: resReserva.fechaFin ? new Date(`${resReserva.fechaFin}T00:00:00Z`).toISOString() : new Date().toISOString(),
          canalorigen: "Pooking",
          montoTotal: resReserva.total,
          moneda: "USD",
          observaciones: "Reserva de vehículo"
        };
        await CarService.registrarReservaCliente(payloadCliente, token);
      }

      // Save confirmation snap and clean up checkout
      const confirmData = {
        idReserva: resReserva.idReserva || 1,
        codigoReserva: resReserva.codigoReserva,
        estado: resReserva.estadoReserva || 'ACT',
        total: resReserva.total,
        conductor: {
          nombres: conductor.nombres,
          apellidos: conductor.apellidos,
          correo: conductor.correo,
          telefono: conductor.telefono,
        },
        vehiculo: {
          marca: resReserva.vehiculo?.marca || vehiculo.marca,
          modelo: resReserva.vehiculo?.modelo || vehiculo.modelo,
          anio: resReserva.vehiculo?.anio || vehiculo.anio,
          imagenUrl: vehiculo.imagenUrl,
        }
      };

      await setStorageItem('car-reserva', JSON.stringify(confirmData));
      
      // Clear storage
      await removeStorageItem('car-selected');
      await removeStorageItem('car-extras');
      await removeStorageItem('car-conductor');
      await removeStorageItem('car-others');
      await removeStorageItem('car-times');
      await removeStorageItem('car-provider');

      // Navigate to confirmation
      router.push({
        pathname: '/autos/confirmacion/[id]',
        params: { id: String(confirmData.idReserva) }
      });

    } catch (err) {
      console.error(err);
      setConfirmando(false);
      alert('Error al procesar y guardar tu reserva de auto.');
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.loadingText}>Cargando información del pago...</Text>
        </View>
        <Footer />
      </View>
    );
  }

  if (error || !vehiculo) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={54} color={Colors.error} />
          <Text style={s.errorTitle}>Error al cargar</Text>
          <Text style={s.errorText}>{error || 'Información de pago incompleta.'}</Text>
          <TouchableOpacity style={s.btnBack} onPress={() => router.push('/autos/resultados')}>
            <Text style={s.btnBackText}>Volver</Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.container}>
          <PaymentHall
            subtotal={subtotal}
            iva={iva}
            total={total}
            ivaLabel="15.0%"
            itemName={`Alquiler de ${vehiculo.marca} ${vehiculo.modelo}`}
            customDetails={customDetails}
            initialNombre={`${conductor.nombres} ${conductor.apellidos}`}
            initialEmail={conductor.correo}
            initialTelefono={conductor.telefono}
            onPagoExitoso={handlePagoExitoso}
            onCancel={() => router.back()}
            buttonLabel="Realizar pago seguro de alquiler"
          />
        </View>
        <Footer />
      </ScrollView>

      {confirmando && (
        <View style={s.confirmandoOverlay}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.confirmandoText}>Confirmando tu reserva...</Text>
          <Text style={s.confirmandoSub}>Por favor espera un momento</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },
  loadingBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400 },
  loadingText: { color: Colors.subtitulo, fontSize: 13, marginTop: 8 },

  confirmandoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    gap: Spacing.md,
  },
  confirmandoText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.titulo,
  },
  confirmandoSub: {
    fontSize: 13,
    color: Colors.subtitulo,
  },
  errorBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: Spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  errorText: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center' },
  btnBack: { backgroundColor: Colors.titulo, paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm },
  btnBackText: { color: '#fff', fontWeight: '700' },
  container: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
  },
});
