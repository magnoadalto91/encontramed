import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';

import HomeScreen from '../screens/medico/HomeScreen';
import MeusPlantoesScreen from '../screens/medico/MeusPlantoesScreen';
import EscalasScreen from '../screens/medico/EscalasScreen';
import FinanceiroScreen from '../screens/medico/FinanceiroScreen';
import PerfilScreen from '../screens/medico/PerfilScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Inicio: '🏠', Plantoes: '📅', Escalas: '🗓', Financeiro: '💰', Perfil: '👤',
};

export default function MedicoNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1B2E',
          borderTopColor: 'rgba(38,208,206,0.15)',
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{ICONS[route.name]}</Text>
        ),
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter', marginTop: 2 },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Plantoes" component={MeusPlantoesScreen} options={{ title: 'Plantões' }} />
      <Tab.Screen name="Escalas" component={EscalasScreen} options={{ title: 'Escala' }} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} options={{ title: 'Financeiro' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}
