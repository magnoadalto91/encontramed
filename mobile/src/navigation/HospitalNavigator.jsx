import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

import DashboardScreen from '../screens/hospital/DashboardScreen';
import CriarPlantaoScreen from '../screens/hospital/CriarPlantaoScreen';
import TrocasScreen from '../screens/hospital/TrocasScreen';
import PerfilHospitalScreen from '../screens/hospital/PerfilHospitalScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard:   { active: 'grid',         inactive: 'grid-outline' },
  CriarPlantao:{ active: 'add-circle',   inactive: 'add-circle-outline' },
  Trocas:      { active: 'swap-horizontal', inactive: 'swap-horizontal-outline' },
  Perfil:      { active: 'business',     inactive: 'business-outline' },
};

export default function HospitalNavigator() {
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
      <Tab.Screen name="Dashboard"    component={DashboardScreen}      options={{ title: 'Dashboard' }} />
      <Tab.Screen name="CriarPlantao" component={CriarPlantaoScreen}   options={{ title: 'Novo Plantão' }} />
      <Tab.Screen name="Trocas"       component={TrocasScreen}          options={{ title: 'Trocas' }} />
      <Tab.Screen name="Perfil"       component={PerfilHospitalScreen}  options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
