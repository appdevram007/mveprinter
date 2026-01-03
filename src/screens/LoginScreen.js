import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../components/Icon';
import { apiRequest } from '../services/api';
import { dummyUserData } from '../config/dummyData';
import { DEVICE_ID } from '../config/constants'; // Add this import

const LoginScreen = ({
  useRealApi,
  onLoginSuccess,
  onShowConfig,
  onInitPrinter,
  onConnectSocket
}) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pin) {
      Alert.alert('Error', 'Please enter both email and PIN');
      return;
    }

    if (pin.length !== 6) {
      Alert.alert('Error', 'PIN must be 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const loginData = await apiRequest('/auth/login', 'POST', {
        email,
        pin,
        deviceId: DEVICE_ID
      });

      if (loginData.success && loginData.token) {
        const userData = loginData.user || dummyUserData;
        
        await AsyncStorage.setItem('userToken', loginData.token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('authToken', loginData.token);
        
        onLoginSuccess(loginData.token, userData);
        onInitPrinter();
        onConnectSocket(loginData.token);
        
        Alert.alert('Success', useRealApi ? 'Login successful!' : 'Login successful! (Dummy Data Mode)');
      } else {
        Alert.alert('Error', loginData.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (!useRealApi || pin === '123456') {
        await AsyncStorage.setItem('userToken', 'dummy_token');
        await AsyncStorage.setItem('userData', JSON.stringify(dummyUserData));
        await AsyncStorage.setItem('authToken', 'dummy_token');
        
        onLoginSuccess('dummy_token', dummyUserData);
        onInitPrinter();
        onConnectSocket('dummy_token');
        
        Alert.alert('Success', 'Login successful! (Dummy Data Mode)');
      } else {
        Alert.alert('Error', 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('/auth/forgot-password', 'POST', { email });
      
      if (response.success) {
        Alert.alert(
          'Reset Email Sent',
          `Reset instructions sent to ${email}. Check your email for the reset token.`
        );
        setIsForgotPassword(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', useRealApi 
        ? 'Failed to send reset email.'
        : 'Dummy reset email sent. Use "123456" as reset token.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!tempToken || !newPin || !confirmPin) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPin.length !== 6) {
      Alert.alert('Error', 'PIN must be 6 digits');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('/auth/reset-password', 'POST', {
        token: tempToken,
        newPin,
        confirmPin
      });
      
      if (response.success) {
        Alert.alert('Success', 'Password reset successful! Please login with new PIN.');
        setIsForgotPassword(false);
        setTempToken('');
        setNewPin('');
        setConfirmPin('');
        setPin('');
      } else {
        Alert.alert('Error', response.message || 'Password reset failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196f3" barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Icon name="restaurant" size={60} color="#2196f3" />
          <Text style={styles.title}>MVE Printer</Text>
          <Text style={styles.subtitle}>Kitchen Order System</Text>
          <View style={styles.modeIndicator}>
            <Text style={styles.modeText}>
              {useRealApi ? '🔌 API Mode' : '🗄️ Dummy Mode'}
            </Text>
          </View>
        </View>
        
        {!isForgotPassword ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="6-digit PIN"
              placeholderTextColor="#999"
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              editable={!isLoading}
            />
            
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="lock" size={20} color="white" />
                  <Text style={styles.loginButtonText}>LOGIN</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => setIsForgotPassword(true)}
              disabled={isLoading}
            >
              <Text style={styles.forgotButtonText}>Forgot PIN?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.configToggleButton}
              onPress={onShowConfig}
            >
              <Icon name="settings" size={16} color="#666" />
              <Text style={styles.configToggleText}>
                {useRealApi ? 'Using Real API' : 'Using Dummy Data'} • Tap to change
              </Text>
            </TouchableOpacity>
            
            {!useRealApi && (
              <View style={styles.demoNoteContainer}>
                <Text style={styles.demoNote}>
                  Demo Credentials:{'\n'}
                  Email: any email address{'\n'}
                  PIN: 123456
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Reset PIN</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Reset Token (from email)"
              placeholderTextColor="#999"
              value={tempToken}
              onChangeText={setTempToken}
              editable={!isLoading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="New 6-digit PIN"
              placeholderTextColor="#999"
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              editable={!isLoading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm 6-digit PIN"
              placeholderTextColor="#999"
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              editable={!isLoading}
            />
            
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="key" size={20} color="white" />
                  <Text style={styles.loginButtonText}>RESET PIN</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setIsForgotPassword(false)}
              disabled={isLoading}
            >
              <Icon name="arrow-back" size={16} color="#666" />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 40 : 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196f3',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  modeIndicator: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  modeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotButton: {
    padding: 15,
    alignItems: 'center',
  },
  forgotButtonText: {
    color: '#2196f3',
    fontSize: 14,
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
  configToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    marginTop: 10,
  },
  configToggleText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  demoNoteContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  demoNote: {
    color: '#1976d2',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default LoginScreen;