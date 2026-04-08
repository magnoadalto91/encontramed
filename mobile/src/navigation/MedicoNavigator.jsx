import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

import HomeScreen from '../screens/medico/HomeScreen';
import MeusPlantoesScreen from '../screens/medico/MeusPlantoesScreen';
import EscalasScreen from '../screens/medico/EscalasScreen';
import PerfilScreen from '../screens/medico/PerfilScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Inicio:   { active: 'home',           inactive: 'home-outline' },
  Plantoes: { active: 'calendar',        inactive: 'calendar-outline' },
  Escalas:  { active: 'albums',          inactive: 'albums-outline' },
  Perfil:   { active: 'person-circle',   inactive: 'person-circle-outline' },
};

export default function MedicoNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1B2E',
          borderTopColor: 'rgba(38,208,206,0.15)',
          paddingTop: 6,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={24} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
      })}
    >
      <Tab.Screen name="Inicio"   component={HomeScreen}           options={{ title: 'Início' }} />
      <Tab.Screen name="Plantoes" component={MeusPlantoesScreen}   options={{ title: 'Plantões' }} />
      <Tab.Screen name="Escalas"  component={EscalasScreen}        options={{ title: 'Escalas' }} />
      <Tab.Screen name="Perfil"   component={PerfilScreen}         options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
