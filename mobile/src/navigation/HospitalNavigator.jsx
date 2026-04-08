import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';

import DashboardScreen from '../screens/hospital/DashboardScreen';
import CriarPlantaoScreen from '../screens/hospital/CriarPlantaoScreen';
import TrocasScreen from '../screens/hospital/TrocasScreen';
import PerfilHospitalScreen from '../screens/hospital/PerfilHospitalScreen';

const Tab = createBottomTabNavigator();
const ICONS = { Dashboard: '📊', CriarPlantao: '➕', Trocas: '🔄', Perfil: '🏥' };

export default function HospitalNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0D1B2E', borderTopColor: 'rgba(38,208,206,0.15)', paddingTop: 8 },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{ICONS[route.name]}</Text>,
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="CriarPlantao" component={CriarPlantaoScreen} options={{ title: 'Novo Plantão' }} />
      <Tab.Screen name="Trocas" component={TrocasScreen} options={{ title: 'Trocas' }} />
      <Tab.Screen name="Perfil" component={PerfilHospitalScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
