import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { getStorageItem, removeStorageItem } from '../services/storage';

interface NavbarProps {
  transparent?: boolean;
}

const NAV_ITEMS = [
  { icon: 'paid' as const,           tooltip: 'Moneda',              id: 'currency' },
  { icon: 'public' as const,         tooltip: 'País',                id: 'country'  },
  { icon: 'help-outline' as const,   tooltip: 'Atención al cliente', id: 'help'     },
  { icon: 'account-circle' as const, tooltip: 'Usuario',             id: 'user'     },
];

export default function Navbar({ transparent = false }: NavbarProps) {
  const router = useRouter();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const checkAuth = async () => {
        const token = await getStorageItem('token');
        const rolesStr = await getStorageItem('roles');
        if (!active) return;
        setIsLoggedIn(!!token);
        if (rolesStr) {
          try {
            const roles = JSON.parse(rolesStr);
            setIsAdmin(roles.includes('Admin') || roles.includes('SuperAdmin'));
          } catch (e) {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      };
      checkAuth();
      return () => { active = false; };
    }, [])
  );

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await removeStorageItem('token');
    await removeStorageItem('usuarioGuid');
    await removeStorageItem('roles');
    await removeStorageItem('guidCliente');
    setIsLoggedIn(false);
    setIsAdmin(false);
    router.replace('/login');
  };

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  // Inset superior del dispositivo (barra de estado / notch). En web es 0.
  const insets = useSafeAreaInsets();

  const iconColor      = transparent ? '#fff'        : Colors.extra1;
  const iconHoverColor = transparent ? Colors.extra2 : Colors.titulo;

  // Build the navbar style dynamically so position logic never conflicts
  const navStyle = [
    s.navbar,
    isMobile && s.navbarMobile,
    transparent
      ? s.navbarTransparent
      : Platform.OS === 'web'
        ? { position: 'sticky' as any, top: 0, backdropFilter: 'blur(10px)' }
        : null,
    // Empuja el header por debajo de la barra de estado del celular.
    { paddingTop: insets.top, height: 64 + insets.top },
  ];

  return (
    <>
      <View style={navStyle}>
        {/* Logo */}
        <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.8}>
          <Text style={[s.logo, transparent && s.logoWhite, isMobile && s.logoMobile]}>
            Pooking.com
          </Text>
        </TouchableOpacity>

        {/* Nav icons */}
        <View style={s.actions}>
          {NAV_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              style={({ hovered }: any) => [s.iconWrapper, hovered && s.iconWrapperHovered]}
              onHoverIn={() => setActiveTooltip(item.tooltip)}
              onHoverOut={() => setActiveTooltip(null)}
              onPress={() => {
                if (item.id === 'user') {
                  setActiveTooltip(null);
                  setShowUserDropdown((v) => !v);
                }
              }}
            >
              {({ hovered }: any) => (
                <>
                  <MaterialIcons
                    name={item.icon}
                    size={24}
                    color={hovered ? iconHoverColor : iconColor}
                  />

                  {/* Tooltip */}
                  {activeTooltip === item.tooltip && !showUserDropdown && (
                    <View style={s.tooltip}>
                      <View style={s.tooltipArrow} />
                      <Text style={s.tooltipText}>{item.tooltip}</Text>
                    </View>
                  )}
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* User Dropdown Modal */}
      <Modal
        visible={showUserDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserDropdown(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserDropdown(false)}
        >
          <View style={s.dropdown}>
            {!isLoggedIn ? (
              <>
                <DropdownItem
                  icon="login"
                  label="Login"
                  onPress={() => { setShowUserDropdown(false); router.push('/login'); }}
                />
                <DropdownItem
                  icon="person-add"
                  label="Registrarse"
                  onPress={() => { setShowUserDropdown(false); router.push('/signup'); }}
                />
              </>
            ) : (
              <>
                <DropdownItem
                  icon="person"
                  label="Mi Perfil"
                  onPress={() => { setShowUserDropdown(false); router.push('/profile'); }}
                />
                {isAdmin && (
                  <DropdownItem
                    icon="dashboard"
                    label="Dashboard"
                    onPress={() => { setShowUserDropdown(false); router.push('/admin'); }}
                  />
                )}
                <DropdownItem
                  icon="logout"
                  label="Salir"
                  onPress={handleLogout}
                  danger
                />
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function DropdownItem({
  icon, label, onPress, danger = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [s.dropdownItem, hovered && s.dropdownItemHovered]}
    >
      <MaterialIcons name={icon} size={20} color={danger ? Colors.error : Colors.extra1} />
      <Text style={[s.dropdownText, danger && { color: Colors.error }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    height: 64,
    backgroundColor: 'rgba(251,248,234,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.3)',
    zIndex: 100,
    ...Shadow.sm,
  },
  navbarTransparent: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%' as any,
    zIndex: 100,
    shadowOpacity: 0,
    elevation: 0,
  },
  navbarMobile: {
    paddingHorizontal: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.titulo,
    letterSpacing: 0.5,
  },
  logoWhite: { color: '#fff' },
  logoMobile: { fontSize: 18 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  iconWrapperHovered: {
    backgroundColor: 'rgba(142,90,84,0.1)',
  },

  // Tooltip
  tooltip: {
    position: 'absolute',
    top: 46,
    left: '50%' as any,
    transform: [{ translateX: -50 }],
    backgroundColor: Colors.extra1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    zIndex: 200,
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' } as any : {}),
  },
  tooltipArrow: {
    position: 'absolute',
    top: -5,
    left: '50%' as any,
    transform: [{ translateX: -5 }],
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.extra1,
  },
  tooltipText: {
    color: Colors.bg,
    fontSize: 11,
    fontWeight: '500',
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' } as any : {}),
  },

  // Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 72,
    paddingRight: Spacing.lg,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    minWidth: 170,
    overflow: 'hidden',
    ...Shadow.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.2)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  dropdownItemHovered: {
    backgroundColor: 'rgba(142,90,84,0.05)',
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.extra1,
    fontWeight: '500',
  },
});
