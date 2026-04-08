import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { authStore } from '../store/authStore';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Role navigators (bottom tabs)
import MedicoNavigator from './MedicoNavigator';
import HospitalNavigator from './HospitalNavigator';

// Shared screens (pushed on top of tabs)
import NotificacoesScreen from '../screens/shared/NotificacoesScreen';
import SuporteScreen from '../screens/shared/SuporteScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import AvaliacaoScreen from '../screens/shared/AvaliacaoScreen';
import ContratoScreen from '../screens/shared/ContratoScreen';

// Medico stack screens
import PlantaoDetailScreen from '../screens/medico/PlantaoDetailScreen';

const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();

function MedicoStack() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MedicoTabs" component={MedicoNavigator} />
      <AppStack.Screen name="PlantaoDetail" component={PlantaoDetailScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Avaliacao" component={AvaliacaoScreen} />
      <AppStack.Screen name="Contrato" component={ContratoScreen} />
      <AppStack.Screen name="Notificacoes" component={NotificacoesScreen} />
      <AppStack.Screen name="Suporte" component={SuporteScreen} />
    </AppStack.Navigator>
  );
}

function HospitalStack() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="HospitalTabs" component={HospitalNavigator} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Avaliacao" component={AvaliacaoScreen} />
      <AppStack.Screen name="Contrato" component={ContratoScreen} />
      <AppStack.Screen name="Notificacoes" component={NotificacoesScreen} />
      <AppStack.Screen name="Suporte" component={SuporteScreen} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const isAuthenticated = authStore(s => s.isAuthenticated);
  const user = authStore(s => s.user);

  if (!isAuthenticated) {
    return (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </AuthStack.Navigator>
    );
  }

  if (user?.role === 'HOSPITAL') return <HospitalStack />;
  return <MedicoStack />;
}
