import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet
} from 'react-native';
import Icon from '../Icon';
import { USE_REAL_API, API_BASE_URL, SOCKET_URL, DEVICE_ID } from '../../config/constants';

const ConfigModal = ({ visible, onClose, useRealApi, setUseRealApi }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.configOverlay}>
        <View style={styles.configContent}>
          <View style={styles.configHeader}>
            <Text style={styles.configTitle}>App Configuration</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.configSection}>
            <View style={styles.configRow}>
              <Icon name="api" size={24} color="#2196f3" />
              <View style={styles.configTextContainer}>
                <Text style={styles.configLabel}>Use Real API</Text>
                <Text style={styles.configDescription}>
                  {useRealApi 
                    ? 'Connected to real backend API' 
                    : 'Using dummy data for development'}
                </Text>
              </View>
              <Switch
                value={useRealApi}
                onValueChange={setUseRealApi}
                trackColor={{ false: '#ddd', true: '#4caf50' }}
                thumbColor="#fff"
              />
            </View>
          </View>
          
          {useRealApi && (
            <View style={styles.apiConfigSection}>
              <Text style={styles.configSubtitle}>API Configuration</Text>
              
              <View style={styles.apiInfo}>
                <Text style={styles.apiInfoLabel}>Base URL:</Text>
                <Text style={styles.apiInfoValue}>{API_BASE_URL}</Text>
              </View>
              
              <View style={styles.apiInfo}>
                <Text style={styles.apiInfoLabel}>Socket URL:</Text>
                <Text style={styles.apiInfoValue}>{SOCKET_URL}</Text>
              </View>
              
              <View style={styles.apiInfo}>
                <Text style={styles.apiInfoLabel}>Device ID:</Text>
                <Text style={styles.apiInfoValue}>{DEVICE_ID}</Text>
              </View>
              
              <Text style={styles.apiNote}>
                Make sure your backend is running at the above URLs
              </Text>
            </View>
          )}
          
          {!useRealApi && (
            <View style={styles.dummyConfigSection}>
              <Text style={styles.configSubtitle}>Dummy Data Mode</Text>
              
              <View style={styles.dummyInfo}>
                <Icon name="database" size={40} color="#ff9800" />
                <Text style={styles.dummyInfoText}>
                  Using generated dummy data for development and testing
                </Text>
              </View>
              
              <View style={styles.demoCredentials}>
                <Text style={styles.demoTitle}>Demo Credentials:</Text>
                <Text style={styles.demoText}>• Email: any email address</Text>
                <Text style={styles.demoText}>• PIN: 123456</Text>
                <Text style={styles.demoText}>• Orders: Automatically generated</Text>
              </View>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.configButton}
            onPress={onClose}
          >
            <Text style={styles.configButtonText}>
              {useRealApi ? 'Connect to API' : 'Use Dummy Data'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.configCloseButton}
            onPress={onClose}
          >
            <Text style={styles.configCloseText}>Continue to App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  configOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  configContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '100%',
    maxHeight: '90%',
    padding: 25,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  configTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  configSection: {
    marginBottom: 25,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  configTextContainer: {
    flex: 1,
    marginHorizontal: 15,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 12,
    color: '#666',
  },
  configSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  apiConfigSection: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  apiInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  apiInfoLabel: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
    width: 100,
  },
  apiInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  apiNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  dummyConfigSection: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  dummyInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  dummyInfoText: {
    fontSize: 14,
    color: '#e65100',
    textAlign: 'center',
    marginTop: 10,
  },
  demoCredentials: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  demoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  configButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  configButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  configCloseButton: {
    padding: 16,
    alignItems: 'center',
  },
  configCloseText: {
    color: '#666',
    fontSize: 14,
  },
});

export default ConfigModal;